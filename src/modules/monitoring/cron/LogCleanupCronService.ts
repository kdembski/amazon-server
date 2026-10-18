import { LogService } from "@/modules/monitoring/services/LogService";
import { CronJob } from "cron";

export class LogCleanupCronService {
  private logService;
  private retentionDays = 30;

  constructor(logService = new LogService()) {
    this.logService = logService;
  }

  schedule() {
    new CronJob("00 30 03 * * *", () => this.run()).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.logService.deleteOlderThan(before);
    console.log(`Deleted ${deleted} logs older than ${before.toISOString()}`);
  }
}
