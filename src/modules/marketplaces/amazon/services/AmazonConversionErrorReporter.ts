import { ConversionErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonConversionErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorDiscordService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";

export class AmazonConversionErrorReporter
  implements ConversionErrorReporter<AmazonAdSelectDto>
{
  private activityEventService;
  private discordService;

  constructor(
    activityEventService = new ActivityEventService(),
    discordService = new AmazonConversionErrorDiscordService()
  ) {
    this.activityEventService = activityEventService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, prices: ListingPrice[], channel: string) {
    await this.activityEventService.creatable.create({
      type: "conversion_error_sent",
      marketplace: "amazon",
      data: {
        asin: ad.asin,
        channel,
        prices: prices.map((price) => ({
          country: price.country.code,
          value: price.value.toString(),
        })),
      },
    });

    this.discordService.setChannel(channel);
    this.discordService.send(ad, prices);
  }
}
