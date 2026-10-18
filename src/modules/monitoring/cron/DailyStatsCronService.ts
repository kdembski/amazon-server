import { LogService } from "@/modules/monitoring/services/LogService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { CronJob } from "cron";

export class DailyStatsCronService {
  private sections;
  private discordService;
  private logService;

  constructor(
    sections: DailyReportSection[],
    discordService = new DiscordLogService(),
    logService = new LogService()
  ) {
    this.sections = sections;
    this.discordService = discordService;
    this.logService = logService;
  }

  schedule() {
    new CronJob("00 00 20 * * *", () => this.run()).start();
  }

  async run() {
    const { now, dayBefore } = this.getTimeStamps();
    const fields = await Promise.all(
      this.sections.map((section) => section.getField(dayBefore, now))
    );
    const scraped = await this.logService.getCountByEvent(
      "ad_scraped",
      dayBefore,
      now
    );

    await this.discordService.sendDaily(fields, scraped);
  }

  private getTimeStamps() {
    const now = new Date();
    const dayBefore = new Date();
    dayBefore.setHours(dayBefore.getHours() - 24);

    return { now, dayBefore };
  }
}
