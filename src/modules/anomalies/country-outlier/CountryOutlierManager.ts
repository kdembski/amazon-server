import { Decimal } from "@prisma/client/runtime/library";
import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierStrategy } from "@/modules/anomalies/country-outlier/CountryOutlierStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { SettingService } from "@/modules/settings/services/SettingService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const MISSING_RATE_WARNING_INTERVAL_MS = 60 * 60 * 1000;

export class CountryOutlierManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private exchangeRateService;
  private strategy;
  private logger;
  private settingService;
  private missingRateWarnedAt = new Map<number, number>();

  constructor(
    reporter: CountryOutlierReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new CountryOutlierStrategy(),
    logger = SystemLogService.getInstance(),
    settingService = new SettingService()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
    this.logger = logger;
    this.settingService = settingService;
  }

  async check(listing: T, allCountryPrices: ListingPrice[][]) {
    const countryPrices = allCountryPrices.filter(([price]) => price.scraped);
    const minPrices = await this.settingService.get("countryOutlier.minPrices");
    if (countryPrices.length < minPrices) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);
    const rules = await this.strategy.getMatchingRules(prices);
    if (!rules.length) return;

    const cheapest = newestPrices.find(
      (price) => price.country === prices[0].country
    )!;
    const reported = await this.reporter.getReportedPrice(listing, cheapest);
    const channelIds = [...this.getChannels(rules)]
      .filter(([, drop]) => !reported || this.isBelowReported(cheapest.value, reported, drop))
      .map(([channelId]) => channelId);
    if (!channelIds.length) return;

    const difference = reported && this.getDifference(cheapest.value, reported);
    for (const channelId of channelIds) {
      await this.reporter.report(listing, prices, channelId, difference);
    }
    await this.reporter.setReportedPrice(listing, cheapest);
  }

  // A channel matched by rules of several groups uses the lowest dropSinceSentPercent.
  private getChannels(rules: CountryOutlierRuleI[]) {
    const channels = new Map<number, number>();
    for (const { channelId, dropSinceSentPercent } of rules) {
      const current = channels.get(channelId) ?? Infinity;
      channels.set(channelId, Math.min(current, dropSinceSentPercent));
    }
    return channels;
  }

  // Compares raw prices of the cheapest country only: PLN values move with exchange rates and
  // changes of the other countries never report a listing again.
  private isBelowReported(value: Decimal, reported: Decimal, dropSinceSentPercent: number) {
    return reported.minus(value).gte(reported.times(dropSinceSentPercent / 100));
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
