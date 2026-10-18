import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ActivityEventType } from "@prisma/client";
import { CronJob } from "cron";

export class HourlyStatsCronService {
  private discordService;
  private activityEventService;
  private metricService;

  constructor(
    discordService = new DiscordLogService(),
    activityEventService = new ActivityEventService(),
    metricService = new ScraperMetricService()
  ) {
    this.discordService = discordService;
    this.activityEventService = activityEventService;
    this.metricService = metricService;
  }

  schedule() {
    new CronJob("00 00 */1 * * *", () => this.run()).start();
  }

  async run() {
    const counts = [
      this.getCount("ad_scraped"),
      ...["1", "2", "3", "4", "5", "6"].map((channel) =>
        this.getCount("conversion_error_sent", channel)
      ),
      this.getCount("pricing_error_sent"),
    ];

    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    const [resolvedCounts, summaries] = await Promise.all([
      Promise.all(counts),
      this.metricService.getSummaries(hoursBefore, now),
    ]);
    await this.discordService.sendHourly(resolvedCounts, summaries);
  }

  getCount(type: ActivityEventType, channel?: string) {
    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    return this.activityEventService.getCount(
      type,
      hoursBefore,
      now,
      channel
    );
  }
}
