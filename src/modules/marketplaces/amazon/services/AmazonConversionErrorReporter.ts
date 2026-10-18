import { ConversionErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonConversionErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorDiscordService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class AmazonConversionErrorReporter
  implements ConversionErrorReporter<AmazonAdSelectDto>
{
  private logService;
  private discordService;

  constructor(
    logService = new LogService(),
    discordService = new AmazonConversionErrorDiscordService()
  ) {
    this.logService = logService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, prices: ListingPrice[], channel: string) {
    await this.logService.creatable.create({
      event: `conversion_error_${channel}_sent`,
    });

    this.discordService.setChannel(channel);
    this.discordService.send(ad, prices);
  }
}
