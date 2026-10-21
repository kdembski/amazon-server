import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { ConversionErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { ConversionErrorStrategy } from "@/modules/anomalies/conversion-error/ConversionErrorStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";

export class ConversionErrorManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private exchangeRateService;
  private strategy;
  private minPriceChange = 0.05;

  constructor(
    reporter: ConversionErrorReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new ConversionErrorStrategy()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
  }

  async check(listing: T, allCountryPrices: ListingPrice[][]) {
    const countryPrices = allCountryPrices.filter(([price]) => price.scraped);
    if (countryPrices.length < 4) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);
    const cheapest = countryPrices.find(
      ([price]) => price.country === prices[0].country
    )!;
    if (!this.hasChanged(cheapest)) return;

    for (const rule of this.strategy.getMatchingRules(prices)) {
      await this.reporter.report(listing, prices, rule.channel);
    }
  }

  // Compares raw prices: PLN values move with exchange rates.
  private hasChanged([newest, previous]: ListingPrice[]) {
    if (!previous) return true;

    const change = newest.value.minus(previous.value).abs();
    return change.gte(previous.value.times(this.minPriceChange));
  }

  // Returns copies: the same price objects are passed to the other error managers.
  private async toPln(prices: ListingPrice[]) {
    const rates = await this.exchangeRateService.getPlnRates();

    return prices.map((price) => {
      const { currencyId } = price.country;
      const rate = rates.find((rate) => rate.sourceId === currencyId);
      if (!rate) return price;

      return { ...price, value: price.value.times(rate.value) };
    });
  }

  private sortPrices(prices: ListingPrice[]) {
    prices.sort((a, b) => a.value.toNumber() - b.value.toNumber());
  }
}
