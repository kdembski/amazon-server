import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { ConversionErrorStrategy } from "@/modules/anomalies/conversion-error/ConversionErrorStrategy";
import { DiscordConversionErrorService } from "@/modules/anomalies/conversion-error/DiscordConversionErrorService";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class ConversionErrorManager implements AnomalyManagerI {
  private discordService;
  private logService;
  private exchangeRateService;
  private strategy;

  constructor(
    discordService = new DiscordConversionErrorService(),
    logService = new LogService(),
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new ConversionErrorStrategy()
  ) {
    this.discordService = discordService;
    this.logService = logService;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
  }

  async check(listing: Listing, countryPrices: ListingPrice[][]) {
    if (countryPrices.length < 3) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);

    for (const rule of this.strategy.getMatchingRules(prices)) {
      await this.report(listing, prices, rule.channel);
    }
  }

  private async report(
    listing: Listing,
    prices: ListingPrice[],
    channel: string
  ) {
    await this.logService.creatable.create({
      event: `conversion_error_${channel}_sent`,
    });

    this.discordService.setChannel(channel);
    this.discordService.send(listing, prices);
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
