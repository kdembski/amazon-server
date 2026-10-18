import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { ActivityEventType } from "@prisma/client";
import { CronJob } from "cron";

export class HourlyStatsCronService {
  private discordService;
  private activityEventService;

  constructor(
    discordService = new DiscordLogService(),
    activityEventService = new ActivityEventService()
  ) {
    this.discordService = discordService;
    this.activityEventService = activityEventService;
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

    await Promise.all(counts).then((counts) => {
      return this.discordService.sendHourly(counts);
    });
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
