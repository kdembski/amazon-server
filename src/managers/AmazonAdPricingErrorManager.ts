import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { DiscordPricingErrorService } from "@/services/discord/DiscordPricingErrorService";
import { LogService } from "@/services/LogService";

export class AmazonAdPricingErrorManager {
  private discordService;
  private logService;

  constructor(
    discordService = new DiscordPricingErrorService(),
    logService = new LogService()
  ) {
    this.discordService = discordService;
    this.logService = logService;
  }

  async check(
    ad: AmazonAdSelectDto,
    countryPrices: AmazonAdPriceSelectDto[][]
  ) {
    const countryPricesToSend = countryPrices.filter((prices) => {
      const isActive = prices[0].country.active;
      return this.isOverPercentageDifference(prices) && isActive;
    });

    if (!countryPricesToSend.length) return;

    await this.logService.creatable.create({ event: "pricing_error_sent" });
    this.discordService.send(ad, countryPricesToSend);
  }

  private isOverPercentageDifference(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    return prices.every((price, i) => {
      if (i === 0) return true;
      if (i === 1) return first.lte(price.value.times(0.5));
      return first.lt(price.value);
    });
  }
}
