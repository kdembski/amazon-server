import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonPriceDropDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPriceDropDiscordService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";

export class AmazonPriceDropReporter
  implements PriceDropReporter<AmazonAdSelectDto>
{
  private businessLogService;
  private discordService;

  constructor(
    businessLogService = new BusinessLogService(),
    discordService = new AmazonPriceDropDiscordService()
  ) {
    this.businessLogService = businessLogService;
    this.discordService = discordService;
  }

  async report(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    await this.businessLogService.creatable.create({
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
