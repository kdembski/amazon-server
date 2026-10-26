import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonPriceDropDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPriceDropDiscordService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";

export class AmazonPriceDropReporter
  implements PriceDropReporter<AmazonAdSelectDto>
{
  private activityEventService;
  private discordService;

  constructor(
    activityEventService = new ActivityEventService(),
    discordService = new AmazonPriceDropDiscordService()
  ) {
    this.activityEventService = activityEventService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    await this.activityEventService.creatable.create({
      type: "price_drop_sent",
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
