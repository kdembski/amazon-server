import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import {
  AmazonAdPriceCreateDto,
  AmazonAdPriceSelectDto,
} from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { DiscordPricingErrorService } from "@/services/discord/DiscordPricingErrorService";
import { LogService } from "@/services/LogService";

export class AmazonAdPricingErrorManager {
  private adPriceService;
  private discordService;
  private logService;

  constructor(
    adPriceService = new AmazonAdPriceService(),
    discordService = new DiscordPricingErrorService(),
    logService = new LogService()
  ) {
    this.adPriceService = adPriceService;
    this.discordService = discordService;
    this.logService = logService;
  }

  async check(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    let marketplaces: AmazonAdPriceSelectDto[][] = [];

    for (const price of prices) {
      const result = await this.adPriceService.getByAdAndCountry({
        adId: ad.id,
        countryId: price.countryId,
      });

      marketplaces.push(result);
    }

    const marketplacesToSend = marketplaces.filter(
      (prices) =>
        this.isOverPercentageDifference(prices) && prices[0].country.active
    );

    if (!marketplacesToSend.length) return;

    await this.logService.creatable.create({
      event: "pricing_error_sent",
    });
    this.discordService.send(ad, marketplacesToSend);
  }

  private isOverPercentageDifference(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0]?.value?.toNumber();
    if (!first || prices.length < 2) return false;

    return prices.every((price, i) => {
      const number = price.value?.toNumber();
      if (i === 0) return true;
      if (i === 1) return first <= number * 0.5;
      return first < number;
    });
  }
}
