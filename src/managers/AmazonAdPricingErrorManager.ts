import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import {
  AmazonAdPriceCreateDto,
  AmazonAdPriceSelectDto,
} from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { DiscordPricingErrorService } from "@/services/discord/DiscordPricingErrorService";

export class AmazonAdPricingErrorManager {
  private adPriceService;
  private discordService;

  constructor(
    adPriceService = new AmazonAdPriceService(),
    discordService = new DiscordPricingErrorService()
  ) {
    this.adPriceService = adPriceService;
    this.discordService = discordService;
  }

  async verify(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const promises = prices.map((price) =>
      this.adPriceService.getByAdAndCountry({
        adId: ad.id,
        countryId: price.countryId,
      })
    );

    await Promise.all(promises).then((results) => {
      const toSend = results.filter((result) =>
        this.isOverPercentageDifference(result)
      );
      if (toSend.length) this.discordService.send(ad, toSend);
    });
  }

  private isOverPercentageDifference(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0]?.value?.toNumber();
    const second = prices[1]?.value.toNumber();

    if (!first || !second) return false;

    return first <= second * 0.5;
  }
}
