import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class AmazonAdPriceCleanupCronService {
  private amazonAdPriceService;
  private logger;
  private retentionDays = 90;

  constructor(
    amazonAdPriceService = new AmazonAdPriceService(),
    logger = SystemLogService.getInstance()
  ) {
    this.amazonAdPriceService = amazonAdPriceService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 00 04 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("AmazonAdPriceCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.amazonAdPriceService.deleteOlderThan(before);
    this.logger.info(
      "AmazonAdPriceCleanupCronService",
      `Deleted ${deleted} Amazon ad prices older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
