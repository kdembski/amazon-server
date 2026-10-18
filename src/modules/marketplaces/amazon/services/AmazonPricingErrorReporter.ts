import { PricingErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonPricingErrorDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorDiscordService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class AmazonPricingErrorReporter
  implements PricingErrorReporter<AmazonAdSelectDto>
{
  private logService;
  private discordService;

  constructor(
    logService = new LogService(),
    discordService = new AmazonPricingErrorDiscordService()
  ) {
    this.logService = logService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    await this.logService.creatable.create({ event: "pricing_error_sent" });
    this.discordService.send(ad, countryPrices);
  }
}
