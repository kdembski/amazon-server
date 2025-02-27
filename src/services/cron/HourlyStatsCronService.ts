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
      const logs = [
        this.getLogCount("ad_scraped"),
        this.getLogCount("conversion_error_2_sent"),
        this.getLogCount("conversion_error_3_sent"),
        this.getLogCount("conversion_error_4_sent"),
        this.getLogCount("conversion_error_5_sent"),
        this.getLogCount("conversion_error_6_sent"),
        this.getLogCount("pricing_error_sent"),
      ];

      await Promise.all(logs).then((logs) => {
        this.discordService.sendHourly(logs);
      });
    });
  }

  getLogCount(event: string) {
    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    return this.logService.getCountByEvent(event, hoursBefore, now);
  }
}
