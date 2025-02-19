import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { roundToTwoDecimals } from "@/helpers/number";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";

export class AmazonAdConversionErrorManager {
  private logService;
  private currencyService;
  private currencyExchangeRateService;
  private adPriceService;
  private discordService;

  constructor(
    logService = new LogService(),
    currencyService = new CurrencyService(),
    currencyExchangeRateService = new CurrencyExchangeRateService(),
    adPriceService = new AmazonAdPriceService(),
    discordService = new DiscordConversionErrorService()
  ) {
    this.logService = logService;
    this.currencyService = currencyService;
    this.currencyExchangeRateService = currencyExchangeRateService;
    this.adPriceService = adPriceService;
    this.discordService = discordService;
  }

  async verify(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    await this.unifyCurrencies(prices);
    this.sortPrices(prices);

    const firstCountryPrices = await this.adPriceService.getByAdAndCountry({
      adId: ad.id,
      countryId: prices[0].countryId,
    });

    const currentLowest = firstCountryPrices[0]?.value.toNumber();
    const previousLowest = firstCountryPrices[1]?.value.toNumber();

    if (currentLowest && previousLowest && currentLowest < previousLowest) {
      return;
    }

    this.verifyByPercentage(ad, prices);
    this.verifyByRange(ad, prices);
  }

  verifyByPercentage(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    if (this.isOverPercentageDifference(prices, 80)) {
      this.discordService.service = "80";
      this.discordService.send(ad, prices);
      return;
    }

    if (this.isOverPercentageDifference(prices, 60)) {
      this.discordService.service = "60";
      this.discordService.send(ad, prices);
      return;
    }
  }

  verifyByRange(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    if (!this.isOverPercentageDifference(prices, 60)) return;

    if (this.isValueInRange(prices, 0, 50)) {
      this.discordService.service = "0_50";
      this.discordService.send(ad, prices);
      return;
    }

    if (this.isValueInRange(prices, 50, 200)) {
      this.discordService.service = "50_200";
      this.discordService.send(ad, prices);
      return;
    }

    if (this.isValueInRange(prices, 200)) {
      this.discordService.service = "200_-";
      this.discordService.send(ad, prices);
      return;
    }
  }

  private isOverPercentageDifference(
    prices: AmazonAdPriceCreateDto[],
    percentage: number
  ) {
    const firstPrice = prices[0]?.value;
    const secondPrice = prices[1]?.value;

    if (!firstPrice || !secondPrice) return;
    return firstPrice <= secondPrice * (1 - percentage / 100);
  }

  private isValueInRange(
    prices: AmazonAdPriceCreateDto[],
    min?: number,
    max?: number
  ) {
    const price = prices?.[0].value;

    if (!price) return;
    if (min && max) return price >= min && price <= max;
    if (min) return price >= min;
    if (max) return price <= max;
  }

  private async unifyCurrencies(prices: AmazonAdPriceCreateDto[]) {
    const pln = await this.currencyService.getByCode("PLN");
    if (!pln) return;

    const rates = await this.currencyExchangeRateService.getByTarget(pln.id);

    prices.forEach((price) => {
      const rate = rates.find(
        (rate) => rate.sourceId === price.country.currencyId
      );
      if (!rate) return;

      price.value = roundToTwoDecimals(price.value * rate.value.toNumber());
    });
  }

  private sortPrices(prices: AmazonAdPriceCreateDto[]) {
    prices.sort((a, b) => a.value - b.value);
  }
}
