import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonPriceDropDiscordService } from "@/modules/marketplaces/amazon/services/AmazonPriceDropDiscordService";
import { AmazonDealCheckService } from "@/modules/marketplaces/amazon/services/AmazonDealCheckService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";

export class AmazonPriceDropReporter
  implements PriceDropReporter<AmazonAdSelectDto>
{
  private businessLogService;
  private discordService;
  private dealCheckService;

  constructor(
    businessLogService = new BusinessLogService(),
    discordService = new AmazonPriceDropDiscordService(),
    dealCheckService = AmazonDealCheckService.getInstance()
  ) {
    this.businessLogService = businessLogService;
    this.discordService = discordService;
    this.dealCheckService = dealCheckService;
  }

  // The newest price of each matched country, in its own currency.
  async checkDeal(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][], channelId: number) {
    const dealPrices = countryPrices.map(([newest]) => ({
      country: newest.country.name,
      value: newest.value.toFixed(2),
      currency: newest.country.currencyCode,
      url: newest.url,
    }));
    const alert = this.discordService.buildEmbed(ad, countryPrices);
    this.dealCheckService.check(ad, dealPrices, alert, channelId);
  }

  async report(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][], channelId: number) {
    await this.businessLogService.creatable.create({
      type: "price_drop_sent",
      marketplace: "amazon",
      data: {
        asin: ad.asin,
        name: ad.name,
        channel: String(channelId),
        prices: countryPrices.map(([newest]) => ({
          country: newest.country.code,
          value: newest.value.toString(),
          currency: newest.country.currencyCode,
        })),
      },
    });
    await this.discordService.send(ad, countryPrices, channelId);
  }
}
