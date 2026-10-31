import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class BusinessLogCleanupCronService {
  private businessLogService;
  private logger;
  private retentionDays = 30;

  constructor(
    businessLogService = new BusinessLogService(),
    logger = SystemLogService.getInstance()
  ) {
    this.businessLogService = businessLogService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 30 03 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("BusinessLogCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.businessLogService.deleteOlderThan(before);
    this.logger.info(
      "BusinessLogCleanupCronService",
      `Deleted ${deleted} activity events older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
