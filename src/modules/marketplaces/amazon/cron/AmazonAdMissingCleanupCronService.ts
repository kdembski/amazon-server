import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class AmazonAdMissingCleanupCronService {
  private amazonAdMissingService;
  private logger;
  private retentionDays = 30;

  constructor(
    amazonAdMissingService = new AmazonAdMissingService(),
    logger = SystemLogService.getInstance()
  ) {
    this.amazonAdMissingService = amazonAdMissingService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 30 04 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("AmazonAdMissingCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.amazonAdMissingService.deleteOlderThan(before);
    this.logger.info(
      "AmazonAdMissingCleanupCronService",
      `Deleted ${deleted} Amazon ad missing countries older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
