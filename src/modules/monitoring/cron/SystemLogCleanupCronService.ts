import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class SystemLogCleanupCronService {
  private logger;
  private retentionDays = 30;

  constructor(logger = SystemLogService.getInstance()) {
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 15 04 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("SystemLogCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.logger.deleteOlderThan(before);
    this.logger.info(
      "SystemLogCleanupCronService",
      `Deleted ${deleted} system logs older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
