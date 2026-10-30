import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";

export class AmazonCountryOutlierReporter
  implements CountryOutlierReporter<AmazonAdSelectDto>
{
  private activityEventService;
  private discordService;

  constructor(
    activityEventService = new ActivityEventService(),
    discordService = new AmazonCountryOutlierDiscordService()
  ) {
    this.activityEventService = activityEventService;
    this.discordService = discordService;
  }

  async report(
    ad: AmazonAdSelectDto,
    prices: ListingPrice[],
    channel: string,
    difference?: number
  ) {
    await this.activityEventService.creatable.create({
      type: "country_outlier_sent",
      marketplace: "amazon",
      data: {
        asin: ad.asin,
        name: ad.name,
        channel,
        prices: prices.map((price) => ({
          country: price.country.code,
          value: price.value.toString(),
        })),
      },
    });

    this.discordService.setChannel(channel);
    await this.discordService.send(ad, prices, difference);
  }
}
