import cron from "node-cron";
import { LogService } from "@/services/LogService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";

export class HourlyStatsCronService {
  private discordService;
  private logService;

  constructor(
    discordService = new DiscordLogService(),
    logService = new LogService()
  ) {
    this.discordService = discordService;
    this.logService = logService;
  }

  schedule() {
    cron.schedule("00 00 */1 * * * *", async () => {
      const scraped = await this.getLogCount("ad_scraped");
      const conversion2 = await this.getLogCount("conversion_error_2_sent");
      const conversion3 = await this.getLogCount("conversion_error_3_sent");
      const conversion4 = await this.getLogCount("conversion_error_4_sent");
      const conversion5 = await this.getLogCount("conversion_error_5_sent");
      const conversion6 = await this.getLogCount("conversion_error_6_sent");
      const pricing = await this.getLogCount("pricing_error_sent");

      this.discordService.send(
        `scraped: ${scraped} | 60%: ${conversion2} | 80%: ${conversion3} | 0-50: ${conversion4} | 50-200: ${conversion5} | 200-*: ${conversion6} | hist: ${pricing}`
      );
    });
  }

  async getLogCount(event: string) {
    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    return (await this.logService.getByEvent(event, hoursBefore, now)).length;
  }
}
