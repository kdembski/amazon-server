import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { SettingService } from "@/modules/settings/services/SettingService";
import { CronService } from "@/shared/system/CronService";

export class DailyStatsCronService extends CronService {
  protected readonly cronTime = "00 00 20 * * *";
  private sections;
  private discordService;
  private activityCountService;
  private settingService;

  constructor(
    sections: DailyReportSection[],
    discordService = new DiscordLogService(),
    activityCountService = new ActivityCountService(),
    logger = SystemLogService.getInstance(),
    settingService = new SettingService()
  ) {
    super(logger);
    this.sections = sections;
    this.discordService = discordService;
    this.activityCountService = activityCountService;
    this.settingService = settingService;
  }

  async run() {
    const { now, dayBefore } = this.getTimeStamps();
    const fields = await Promise.all(
      this.sections.map((section) => section.getField(dayBefore, now))
    );
    const minPrices = await this.settingService.get("countryOutlier.minPrices");
    const [scraped, comparable] = await Promise.all([
      this.activityCountService.getCount("ad_scraped", dayBefore, now),
      minPrices === undefined
        ? undefined
        : this.activityCountService.getCountWithMinPrices("ad_scraped", minPrices, dayBefore, now),
    ]);

    await this.discordService.sendDaily(fields, scraped, comparable, minPrices);
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
