import { Decimal } from "@prisma/client/runtime/client";
import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleMatcher } from "@/modules/anomalies/country-outlier/CountryOutlierRuleMatcher";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { SettingService } from "@/modules/settings/services/SettingService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { LogThrottle } from "@/shared/logging/services/LogThrottle";

const MISSING_RATE_WARNING_INTERVAL_MS = 60 * 60 * 1000;

export class CountryOutlierManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private exchangeRateService;
  private ruleMatcher;
  private logger;
  private settingService;
  private evaluator;
  // one warning an hour per currency
  private missingRateThrottle = new LogThrottle(MISSING_RATE_WARNING_INTERVAL_MS);

  constructor(
    reporter: CountryOutlierReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    ruleMatcher = new CountryOutlierRuleMatcher(),
    logger = SystemLogService.getInstance(),
    settingService = new SettingService(),
    evaluator = new CountryOutlierEvaluator()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.ruleMatcher = ruleMatcher;
    this.logger = logger;
    this.settingService = settingService;
    this.evaluator = evaluator;
  }

  async check(listing: T, allCountryPrices: ListingPrice[][]) {
    const countryPrices = await this.getScrapedCountryPrices(allCountryPrices);
    if (!countryPrices) return;

    const prices = await this.getSortedPlnPrices(countryPrices);
    const history = countryPrices.find(([price]) => price.country === prices[0].country)!;
    const channels = this.getChannels(await this.ruleMatcher.getMatches(prices, history));
    if (!channels.length || !this.evaluator.isAtLowest(history)) return;

    const [cheapest, lowest] = history;
    if (!(await this.isBelowReported(listing, cheapest))) return;

    const difference = lowest && this.getDifference(cheapest.value, lowest.value);
    await this.report(listing, prices, channels, difference);
    await this.reporter.setReportedPrice(listing, cheapest);
  }

  // The prices of the countries in this scrape; undefined with fewer than minPrices countries
  private async getScrapedCountryPrices(allCountryPrices: ListingPrice[][]) {
    const countryPrices = allCountryPrices.filter(([price]) => price.scraped);
    const minPrices = await this.settingService.get("countryOutlier.minPrices");
    if (minPrices === undefined || countryPrices.length < minPrices) return undefined;
    return countryPrices;
  }

  // The newest price of every country in PLN, cheapest first
  private async getSortedPlnPrices(countryPrices: ListingPrice[][]) {
    const prices = await this.toPln(countryPrices.map((prices) => prices[0]));
    this.sortPrices(prices);
    return prices;
  }

  private async report(
    listing: T,
    prices: ListingPrice[],
    channels: { channelId: number; dealCheck: boolean }[],
    difference?: number
  ) {
    for (const { channelId, dealCheck } of channels) {
      if (dealCheck) await this.reporter.checkDeal(listing, prices, channelId, difference);
      else await this.reporter.report(listing, prices, channelId, difference);
    }
  }

  // A channel matched by rules of several groups is reported once, in the mode (dealCheck or plain) of its rule
  // in the earliest group.
  private getChannels(rules: CountryOutlierRuleI[]) {
    const channels = new Map<number, boolean>();
    for (const { channelId, dealCheck } of rules) {
      if (!channels.has(channelId)) channels.set(channelId, dealCheck);
    }
    return [...channels].map(([channelId, dealCheck]) => ({ channelId, dealCheck }));
  }

  // Without a reported price the drop since it is not checked. Compares raw prices of the cheapest country only:
  // PLN values move with exchange rates and changes of the other countries never report a listing again.
  private async isBelowReported(listing: T, cheapest: ListingPrice) {
    const dropSinceSentPercent = await this.settingService.get("countryOutlier.dropSinceSentPercent");
    if (dropSinceSentPercent === undefined) return false;

    const reported = await this.reporter.getReportedPrice(listing, cheapest);
    if (!reported) return true;
    return reported.minus(cheapest.value).gte(reported.times(dropSinceSentPercent / 100));
  }

  private getDifference(value: Decimal, previous: Decimal) {
    const previousValue = previous.toNumber();
    return Math.round(((value.toNumber() - previousValue) * 100) / previousValue);
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

  private warnMissingRate({ country }: ListingPrice) {
    if (!this.missingRateThrottle.shouldLog(country.currencyId)) return;
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
