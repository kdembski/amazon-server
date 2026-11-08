import { ScraperMetricRollupService } from "@/modules/monitoring/services/ScraperMetricRollupService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronService } from "@/shared/system/CronService";

export class ScraperMetricRollupCronService extends CronService {
  protected readonly cronTime = "00 05 * * * *";
  private rollupService;

  constructor(
    rollupService = new ScraperMetricRollupService(),
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.rollupService = rollupService;
  }

  async run() {
    const hours = await this.rollupService.rollUp(new Date());
    this.logger.info("ScraperMetricRollupCronService", `Rolled up ${hours} hours of scraper metrics`, {
      hours,
    });
  }
}
