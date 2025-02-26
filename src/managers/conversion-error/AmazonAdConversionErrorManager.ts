import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { roundToTwoDecimals } from "@/helpers/number";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { AmazonAdConversionErrorPercentageManager } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageManager";
import { AmazonAdConversionErrorRangeManager } from "@/managers/conversion-error/AmazonAdConversionErrorRangeManager";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";
import { StorageService } from "@/services/StorageService";

export class AmazonAdConversionErrorManager {
  private percentageManager;
  private rangeManager;
  private exchangeRateService;
  private storageService;

  constructor(
    percentageManager = new AmazonAdConversionErrorPercentageManager(),
    rangeManager = new AmazonAdConversionErrorRangeManager(),
    exchangeRateService = new CurrencyExchangeRateService(),
    storageService = StorageService.getInstance()
  ) {
    this.percentageManager = percentageManager;
    this.rangeManager = rangeManager;
    this.exchangeRateService = exchangeRateService;
    this.storageService = storageService;
  }

  async check(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    if (prices.length < 3) return;

    await this.unifyCurrencies(prices);
    this.sortPrices(prices);

    this.percentageManager.check(ad, prices);
    this.rangeManager.check(ad, prices);
  }

  private async unifyCurrencies(prices: AmazonAdPriceCreateDto[]) {
    const rates = await this.getPlnExchangeRates();

    prices.forEach((price) => {
      const { currencyId } = price.country;
      const rate = rates.find((rate) => rate.sourceId === currencyId);
      if (!rate) return;

      price.value = roundToTwoDecimals(price.value * rate.value.toNumber());
    });
  }

  private async getPlnExchangeRates() {
    const storedRates = this.storageService.state.plnExchangeRates;

    if (!storedRates) {
      const rates = await this.exchangeRateService.getByTargetCode("PLN");
      this.storageService.state.plnExchangeRates = rates;
      return rates;
    }

    return storedRates;
  }

  private sortPrices(prices: AmazonAdPriceCreateDto[]) {
    prices.sort((a, b) => a.value - b.value);
  }
}
