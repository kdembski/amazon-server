import { ConversionErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonConversionErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorDiscordService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";

const SCRAPING_DELAY_HOURS = 72;

export class AmazonConversionErrorReporter
  implements ConversionErrorReporter<AmazonAdSelectDto>
{
  private activityEventService;
  private discordService;
  private adRepository;

  constructor(
    activityEventService = new ActivityEventService(),
    discordService = new AmazonConversionErrorDiscordService(),
    adRepository = new AmazonAdRepository()
  ) {
    this.activityEventService = activityEventService;
    this.discordService = discordService;
    this.adRepository = adRepository;
  }

  async report(ad: AmazonAdSelectDto, prices: ListingPrice[], channel: string) {
    await this.activityEventService.creatable.create({
      type: "conversion_error_sent",
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
    await this.adRepository.delayScraping(ad.id, SCRAPING_DELAY_HOURS);

    this.discordService.setChannel(channel);
    this.discordService.send(ad, prices);
  }
}
