import { CountryOutlierReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { AmazonCountryOutlierDiscordService } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierDiscordService";
import { AmazonCountryOutlierReportRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryOutlierReportRepository";
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
    reportRepository = new AmazonCountryOutlierReportRepository()
  ) {
    this.businessLogService = businessLogService;
    this.discordService = discordService;
    this.reportRepository = reportRepository;
  }

  getReportedPrice(ad: AmazonAdSelectDto, price: ListingPrice) {
    return this.reportRepository.getValue(ad.id, price.country.id);
  }

  setReportedPrice(ad: AmazonAdSelectDto, price: ListingPrice) {
    return this.reportRepository.set(ad.id, price.country.id, price.value);
  }

  async report(
    ad: AmazonAdSelectDto,
    prices: ListingPrice[],
    channel: string,
    difference?: number
  ) {
    await this.businessLogService.creatable.create({
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
