import cron from "node-cron";
import { LogService } from "@/services/LogService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";

export class DailyStatsCronService {
  private discordService;
  private adService;
  private logService;
  private exchangeRatesService;

  constructor(
    discordService = new DiscordLogService(),
    adService = new AmazonAdService(),
    logService = new LogService(),
    exchangeRatesService = new CurrencyExchangeRateService()
  ) {
    this.discordService = discordService;
    this.adService = adService;
    this.logService = logService;
    this.exchangeRatesService = exchangeRatesService;
  }

  async schedule() {
    cron.schedule("00 00 20 * * * *", async () => {
      const adsCount = await this.getAdsCount();
      const rates = await this.getRates();
      const scraped = await this.getScrapedCount();

      this.discordService.sendDaily(adsCount, rates, scraped);
    });
  }

  private async getAdsCount() {
    const { now, dayBefore } = this.getTimeStamps();

    return {
      total: await this.adService.getCount(),
      today: await this.adService.getCount(dayBefore, now),
    };
  }

  private async getRates() {
    const rates = await this.exchangeRatesService.getByTargetCode("PLN");
    return rates.filter((rate) => rate.source.code !== "PLN");
  }

  private getScrapedCount() {
    const { now, dayBefore } = this.getTimeStamps();
    return this.logService.getCountByEvent("ad_scraped", dayBefore, now);
  }

  private getTimeStamps() {
    const now = new Date();
    const dayBefore = new Date();
    dayBefore.setHours(dayBefore.getHours() - 24);

    return { now, dayBefore };
  }
}
