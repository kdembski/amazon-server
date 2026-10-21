import { PricingErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonPricingErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorDiscordService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";

export class AmazonPricingErrorReporter
  implements PricingErrorReporter<AmazonAdSelectDto>
{
  private activityEventService;
  private discordService;

  constructor(
    activityEventService = new ActivityEventService(),
    discordService = new AmazonPricingErrorDiscordService()
  ) {
    this.activityEventService = activityEventService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    await this.activityEventService.creatable.create({
      type: "pricing_error_sent",
      marketplace: "amazon",
      data: {
        asin: ad.asin,
        name: ad.name,
        prices: countryPrices.map(([newest]) => ({
          country: newest.country.code,
          value: newest.value.toString(),
          currency: newest.country.currencyCode,
        })),
      },
    });
    await this.discordService.send(ad, countryPrices);
  }
}
