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
    const promises = prices.map((price) =>
      this.adPriceService.getByAdAndCountry({
        adId: ad.id,
        countryId: price.countryId,
      })
    );

    await Promise.all(promises).then(async (results) => {
      const toSend = results.filter((result) =>
        this.isOverPercentageDifference(result)
      );

      if (toSend.length) {
        await this.logService.creatable.create({
          event: "pricing_error_sent",
        });
        this.discordService.send(ad, toSend);
      }
    });
  }

  private isOverPercentageDifference(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0]?.value?.toNumber();
    const second = prices[1]?.value.toNumber();

    if (!first || !second) return false;

    return first <= second * 0.5;
  }
}
