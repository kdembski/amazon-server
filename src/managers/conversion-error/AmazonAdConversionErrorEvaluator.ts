import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { roundToTwoDecimals } from "@/helpers/number";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";
import { StorageService } from "@/services/StorageService";

export class AmazonAdConversionErrorEvaluator {
  private adPriceService;

  constructor(adPriceService = new AmazonAdPriceService()) {
    this.adPriceService = adPriceService;
  }

  async isHigherThanPrevious(
    ad: AmazonAdSelectDto,
    prices: AmazonAdPriceCreateDto[]
  ) {
    const firstCountryPrices = await this.adPriceService.getByAdAndCountry({
      adId: ad.id,
      countryId: prices[0].countryId,
    });

    const currentLowest = firstCountryPrices[0]?.value.toNumber();
    const previousLowest = firstCountryPrices[1]?.value.toNumber();

    return (
      !!currentLowest && !!previousLowest && currentLowest >= previousLowest
    );
  }

  isOverPercentageDifference(
    prices: AmazonAdPriceCreateDto[],
    percentage: number
  ) {
    const firstPrice = prices[0]?.value;
    const secondPrice = prices[1]?.value;

    if (!firstPrice || !secondPrice) return;
    return firstPrice <= secondPrice * (1 - percentage / 100);
  }

  isInRange(prices: AmazonAdPriceCreateDto[], min?: number, max?: number) {
    const price = prices?.[0].value;

    if (!price) return;
    if (min && max) return price >= min && price <= max;
    if (min) return price >= min;
    if (max) return price <= max;
  }
}
