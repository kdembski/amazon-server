import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdAnomalyManagerI } from "@/interfaces/AmazonAdAnomalyManagerI";
import { AmazonAdConversionErrorStrategy } from "@/managers/conversion-error/AmazonAdConversionErrorStrategy";
import { CurrencyExchangeRateService } from "@/modules/currency/services/CurrencyExchangeRateService";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class AmazonAdConversionErrorManager implements AmazonAdAnomalyManagerI {
  private discordService;
  private logService;
  private exchangeRateService;
  private strategy;

  constructor(
    discordService = new DiscordConversionErrorService(),
    logService = new LogService(),
    exchangeRateService = new CurrencyExchangeRateService(),
    strategy = new AmazonAdConversionErrorStrategy()
  ) {
    this.discordService = discordService;
    this.logService = logService;
    this.exchangeRateService = exchangeRateService;
    this.strategy = strategy;
  }

  async check(
    ad: AmazonAdSelectDto,
    countryPrices: AmazonAdPriceSelectDto[][]
  ) {
    if (countryPrices.length < 3) return;

    const newestPrices = countryPrices.map((prices) => prices[0]);
    const prices = await this.toPln(newestPrices);
    this.sortPrices(prices);

    for (const rule of this.strategy.getMatchingRules(prices)) {
      await this.report(ad, prices, rule.channel);
    }
  }

  private async report(
    ad: AmazonAdSelectDto,
    prices: AmazonAdPriceSelectDto[],
    channel: string
  ) {
    await this.logService.creatable.create({
      event: `conversion_error_${channel}_sent`,
    });

    this.discordService.setChannel(channel);
    this.discordService.send(ad, prices);
  }

  // Returns copies: the same price objects are passed to the other error managers.
  private async toPln(prices: AmazonAdPriceSelectDto[]) {
    const rates = await this.exchangeRateService.getPlnRates();

    return prices.map((price) => {
      const { currencyId } = price.country;
      const rate = rates.find((rate) => rate.sourceId === currencyId);
      if (!rate) return price;

      return { ...price, value: price.value.times(rate.value) };
    });
  }

  private sortPrices(prices: AmazonAdPriceSelectDto[]) {
    prices.sort((a, b) => a.value.toNumber() - b.value.toNumber());
  }
}
