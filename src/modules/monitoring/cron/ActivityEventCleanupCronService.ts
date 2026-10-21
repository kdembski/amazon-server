import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ActivityEventCleanupCronService {
  private activityEventService;
  private logger;
  private retentionDays = 30;

  constructor(
    activityEventService = new ActivityEventService(),
    logger = SystemLogService.getInstance()
  ) {
    this.activityEventService = activityEventService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 30 03 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ActivityEventCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.activityEventService.deleteOlderThan(before);
    this.logger.info(
      "ActivityEventCleanupCronService",
      `Deleted ${deleted} activity events older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
