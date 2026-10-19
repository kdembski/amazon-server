import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { ConversionErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { ConversionErrorStrategy } from "@/modules/anomalies/conversion-error/ConversionErrorStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";

export class ConversionErrorManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private exchangeRateService;
  private strategy;

  constructor(
    reporter: ConversionErrorReporter<T>,
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new ConversionErrorStrategy()
  ) {
    this.reporter = reporter;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    if (countryPrices.length < 3) return;
    if (this.isUnchanged(countryPrices)) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);

    for (const rule of this.strategy.getMatchingRules(prices)) {
      await this.reporter.report(listing, prices, rule.channel);
    }
  }

  // Compares raw prices: PLN values move with exchange rates.
  private isUnchanged(countryPrices: ListingPrice[][]) {
    return countryPrices.every((prices) =>
      prices[1]?.value.equals(prices[0].value)
    );
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
