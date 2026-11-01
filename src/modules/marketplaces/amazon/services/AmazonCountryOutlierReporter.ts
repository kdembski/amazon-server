import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import { AmazonCountryOutlierChannelReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierChannelReportRepository";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";

export class AmazonCountryOutlierReporter
  implements CountryOutlierReporter<AmazonAdSelectDto>
{
  private businessLogService;
  private discordService;
  private reportRepository;

  constructor(
    businessLogService = new BusinessLogService(),
    discordService = new AmazonCountryOutlierDiscordService(),
    reportRepository = new AmazonCountryOutlierChannelReportRepository()
  ) {
    this.businessLogService = businessLogService;
    this.discordService = discordService;
    this.reportRepository = reportRepository;
  }

  getReportedPrice(ad: AmazonAdSelectDto, price: ListingPrice, channelId: number) {
    return this.reportRepository.getValue(ad.id, price.country.id, channelId);
  }

  setReportedPrice(ad: AmazonAdSelectDto, price: ListingPrice, channelId: number) {
    return this.reportRepository.set(ad.id, price.country.id, channelId, price.value);
  }

  async report(
    ad: AmazonAdSelectDto,
    prices: ListingPrice[],
    channelId: number,
    difference?: number
  ) {
    await this.businessLogService.creatable.create({
      type: "country_outlier_sent",
      marketplace: "amazon",
      data: {
        asin: ad.asin,
        name: ad.name,
        channel: String(channelId),
        prices: prices.map((price) => ({
          country: price.country.code,
          value: price.value.toString(),
        })),
      },
    });

    await this.discordService.send(channelId, ad, prices, difference);
  }
}
