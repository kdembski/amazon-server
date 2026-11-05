import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ScraperMetricRollupCronService {
  private scraperMetricService;
  private logger;

  constructor(
    scraperMetricService = new ScraperMetricService(),
    logger = SystemLogService.getInstance()
  ) {
    this.scraperMetricService = scraperMetricService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 05 * * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ScraperMetricRollupCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const hours = await this.scraperMetricService.rollUp(new Date());
    this.logger.info("ScraperMetricRollupCronService", `Rolled up ${hours} hours of scraper metrics`, {
      hours,
    });
  }
}
