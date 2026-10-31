import { Decimal } from "@prisma/client/runtime/library";
import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierStrategy } from "@/modules/anomalies/country-outlier/CountryOutlierStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { MIN_COUNTRY_OUTLIER_PRICES } from "@/shared/utils/countryOutlier";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const MISSING_RATE_WARNING_INTERVAL_MS = 60 * 60 * 1000;

export class CountryOutlierManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private exchangeRateService;
  private strategy;
  private logger;
  private minPriceDrop = 0.05;
  private missingRateWarnedAt = new Map<number, number>();

  constructor(
    reporter: CountryOutlierReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new CountryOutlierStrategy(),
    logger = SystemLogService.getInstance()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
    this.logger = logger;
  }

  async check(listing: T, allCountryPrices: ListingPrice[][]) {
    const countryPrices = allCountryPrices.filter(([price]) => price.scraped);
    if (countryPrices.length < MIN_COUNTRY_OUTLIER_PRICES) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);
    const rules = this.strategy.getMatchingRules(prices);
    if (!rules.length) return;

    const cheapest = newestPrices.find(
      (price) => price.country === prices[0].country
    )!;
    const reported = await this.reporter.getReportedPrice(listing, cheapest);
    if (reported && !this.isBelowReported(cheapest.value, reported)) return;

    const difference = reported && this.getDifference(cheapest.value, reported);
    for (const rule of rules) {
      await this.reporter.report(listing, prices, rule.channel, difference);
    }
    await this.reporter.setReportedPrice(listing, cheapest);
  }

  // Compares raw prices of the cheapest country only: PLN values move with exchange rates and
  // changes of the other countries never report a listing again.
  private isBelowReported(value: Decimal, reported: Decimal) {
    return reported.minus(value).gte(reported.times(this.minPriceDrop));
  }

  private getDifference(value: Decimal, reported: Decimal) {
    const reportedValue = reported.toNumber();
    return Math.round(((value.toNumber() - reportedValue) * 100) / reportedValue);
  }

  // Returns copies: the same price objects are passed to the other error managers.
  private async toPln(prices: ListingPrice[]) {
    const rates = await this.exchangeRateService.getPlnRates();

    return prices.map((price) => {
      const { currencyId } = price.country;
      const rate = rates.find((rate) => rate.sourceId === currencyId);
      if (!rate) {
        this.warnMissingRate(price);
        return price;
      }

      return { ...price, value: price.value.times(rate.value) };
    });
  }

  // At most once an hour per currency
  private warnMissingRate({ country }: ListingPrice) {
    const now = Date.now();
    const warnedAt = this.missingRateWarnedAt.get(country.currencyId);
    if (warnedAt !== undefined && now - warnedAt < MISSING_RATE_WARNING_INTERVAL_MS) return;

    this.missingRateWarnedAt.set(country.currencyId, now);
    this.logger.warn(
      "CountryOutlierManager",
      `No PLN exchange rate for ${country.currencyCode}, compared without conversion`,
      { currencyId: country.currencyId, currencyCode: country.currencyCode, country: country.code }
    );
  }

  private sortPrices(prices: ListingPrice[]) {
    prices.sort((a, b) => a.value.toNumber() - b.value.toNumber());
  }
}
