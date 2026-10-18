import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { CronJob } from "cron";

export class DailyStatsCronService {
  private sections;
  private discordService;
  private activityEventService;

  constructor(
    sections: DailyReportSection[],
    discordService = new DiscordLogService(),
    activityEventService = new ActivityEventService()
  ) {
    this.sections = sections;
    this.discordService = discordService;
    this.activityEventService = activityEventService;
  }

  schedule() {
    new CronJob("00 00 20 * * *", () => this.run()).start();
  }

  async run() {
    const { now, dayBefore } = this.getTimeStamps();
    const fields = await Promise.all(
      this.sections.map((section) => section.getField(dayBefore, now))
    );
    const scraped = await this.activityEventService.getCount(
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
