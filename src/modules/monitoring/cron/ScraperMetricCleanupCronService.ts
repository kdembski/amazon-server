import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { CronJob } from "cron";

export class ScraperMetricCleanupCronService {
  private scraperMetricService;
  private retentionDays = 30;

  constructor(scraperMetricService = new ScraperMetricService()) {
    this.scraperMetricService = scraperMetricService;
  }

  schedule() {
    new CronJob("00 45 03 * * *", () => this.run()).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.scraperMetricService.deleteOlderThan(before);
    console.log(
      `Deleted ${deleted} scraper metrics older than ${before.toISOString()}`
    );
  }
}
