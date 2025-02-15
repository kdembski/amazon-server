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
      const now = new Date();

      const oneHoursBefore = new Date();
      oneHoursBefore.setHours(oneHoursBefore.getHours() - 1);

      const scrapedLogs = await this.logService.getByEvent(
        "ad_scraped",
        oneHoursBefore,
        now
      );
      const sentLogs = await this.logService.getByEvent(
        "ad_sent",
        oneHoursBefore,
        now
      );

      this.discordService.send(
        `Scraped: ${scrapedLogs.length}/h | Sent: ${sentLogs.length}/h`
      );
    });
  }
}
