import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import {
  AmazonAdPriceCreateDto,
  AmazonAdPriceSelectDto,
} from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { DiscordService } from "@/services/DiscordService";
import { LogService } from "@/services/LogService";

export class AmazonAdPricingErrorManager {
  private adPriceService;
  private discordService;
  private logService;

  constructor(
    adPriceService = new AmazonAdPriceService(),
    discordService = new DiscordService(),
    logService = new LogService()
  ) {
    this.adPriceService = adPriceService;
    this.discordService = discordService;
    this.logService = logService;
  }

  async verify(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const promises = prices.map((price) =>
      this.adPriceService.getByAdAndCurrency({
        adId: ad.id,
        currencyId: price.currencyId,
      })
    );

    await Promise.all(promises).then((results) => {
      const toSend = results.filter((result) => this.shouldSend(result));
    });
  }

  private shouldSend(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0]?.value?.toNumber();
    const second = prices[1]?.value.toNumber();

    if (!first || !second) return false;

    return first <= second * 0.7;
  }
}
