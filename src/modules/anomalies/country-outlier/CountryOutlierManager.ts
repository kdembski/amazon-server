import { Decimal } from "@prisma/client/runtime/library";
import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleMatcher } from "@/modules/anomalies/country-outlier/CountryOutlierRuleMatcher";
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
  // one warning an hour per currency
  private missingRateThrottle = new LogThrottle(MISSING_RATE_WARNING_INTERVAL_MS);

  constructor(
    reporter: CountryOutlierReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    ruleMatcher = new CountryOutlierRuleMatcher(),
    logger = SystemLogService.getInstance(),
    settingService = new SettingService()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.ruleMatcher = ruleMatcher;
    this.logger = logger;
    this.settingService = settingService;
  }

  async check(listing: T, allCountryPrices: ListingPrice[][]) {
    const countryPrices = await this.getScrapedCountryPrices(allCountryPrices);
    if (!countryPrices) return;

    const prices = await this.getSortedPlnPrices(countryPrices);
    const rules = await this.ruleMatcher.getMatches(prices);
    if (!rules.length) return;

    const [cheapest, previous] = countryPrices.find(([price]) => price.country === prices[0].country)!;
    const channelIds = await this.getChannelsToReport(listing, cheapest, rules);
    if (!channelIds.length) return;

    const difference = previous && this.getDifference(cheapest.value, previous.value);
    await this.report(listing, prices, channelIds, difference);
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

  // The matched channels whose dropSinceSentPercent the cheapest price passed since the reported one
  private async getChannelsToReport(listing: T, cheapest: ListingPrice, rules: CountryOutlierRuleI[]) {
    const reported = await this.reporter.getReportedPrice(listing, cheapest);
    return [...this.getChannels(rules)]
      .filter(([, drop]) => !reported || this.isBelowReported(cheapest.value, reported, drop))
      .map(([channelId]) => channelId);
  }

  private async report(listing: T, prices: ListingPrice[], channelIds: number[], difference?: number) {
    for (const channelId of channelIds) {
      await this.reporter.report(listing, prices, channelId, difference);
    }
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
