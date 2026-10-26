import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ActivityEventType } from "@prisma/client";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class HourlyStatsCronService {
  private discordService;
  private activityEventService;
  private metricService;
  private logger;
  private activityCountService;

  constructor(
    discordService = new DiscordLogService(),
    activityEventService = new ActivityEventService(),
    metricService = new ScraperMetricService(),
    logger = SystemLogService.getInstance(),
    activityCountService = new ActivityCountService()
  ) {
    this.discordService = discordService;
    this.activityEventService = activityEventService;
    this.metricService = metricService;
    this.logger = logger;
    this.activityCountService = activityCountService;
  }

  schedule() {
    new CronJob("00 00 */1 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("HourlyStatsCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const counts = [
      this.activityCountService.getCount("ad_scraped", ...this.getLastHour()),
      ...["1", "2", "3", "4", "5", "6"].map((channel) =>
        this.getCount("country_outlier_sent", channel)
      ),
      this.getCount("price_drop_sent"),
    ];

    const to = new Date();
    to.setMinutes(0, 0, 0);
    to.setTime(to.getTime() - 90_000);
    const from = new Date(to.getTime() - 3_600_000);

    const [resolvedCounts, summaries] = await Promise.all([
      Promise.all(counts),
      this.metricService.getSummaries(from, to).catch((error) => {
        this.logger.error(
          "HourlyStatsCronService",
          "Scraper metric summaries failed, sending the report without them",
          { error, from, to }
        );
        return [];
      }),
    ]);
    await this.discordService.sendHourly(resolvedCounts, summaries);
    this.logger.info("HourlyStatsCronService", "Hourly report sent", {
      counts: resolvedCounts,
      scrapers: summaries.length,
    });
  }

  getCount(type: ActivityEventType, channel?: string) {
    return this.activityEventService.getCount(type, ...this.getLastHour(), channel);
  }

  private getLastHour(): [Date, Date] {
    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    return [hoursBefore, now];
  }
}
