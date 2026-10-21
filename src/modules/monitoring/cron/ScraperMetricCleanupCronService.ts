import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ScraperMetricCleanupCronService {
  private scraperMetricService;
  private logger;
  private retentionDays = 30;

  constructor(
    scraperMetricService = new ScraperMetricService(),
    logger = SystemLogService.getInstance()
  ) {
    this.scraperMetricService = scraperMetricService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 45 03 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ScraperMetricCleanupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.scraperMetricService.deleteOlderThan(before);
    this.logger.info(
      "ScraperMetricCleanupCronService",
      `Deleted ${deleted} scraper metrics older than ${before.toISOString()}`,
      { deleted, before }
    );
  }
}
