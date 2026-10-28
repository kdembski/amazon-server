import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { MIN_COUNTRY_OUTLIER_PRICES } from "@/shared/utils/countryOutlier";
import { CronJob } from "cron";

export class DailyStatsCronService {
  private sections;
  private discordService;
  private activityCountService;
  private logger;

  constructor(
    sections: DailyReportSection[],
    discordService = new DiscordLogService(),
    activityCountService = new ActivityCountService(),
    logger = SystemLogService.getInstance()
  ) {
    this.sections = sections;
    this.discordService = discordService;
    this.activityCountService = activityCountService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 00 20 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("DailyStatsCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const { now, dayBefore } = this.getTimeStamps();
    const fields = await Promise.all(
      this.sections.map((section) => section.getField(dayBefore, now))
    );
    const [scraped, comparable] = await Promise.all([
      this.activityCountService.getCount("ad_scraped", dayBefore, now),
      this.activityCountService.getCountWithMinPrices(
        "ad_scraped",
        MIN_COUNTRY_OUTLIER_PRICES,
        dayBefore,
        now
      ),
    ]);

    await this.discordService.sendDaily(fields, scraped, comparable);
    this.logger.info("DailyStatsCronService", "Daily report sent", {
      scraped,
      comparable,
      sections: fields.map((field) => field.name),
    });
  }

  private getTimeStamps() {
    const now = new Date();
    const dayBefore = new Date();
    dayBefore.setHours(dayBefore.getHours() - 24);

    return { now, dayBefore };
  }
}
