import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { CronJob } from "cron";

export class ActivityEventCleanupCronService {
  private activityEventService;
  private retentionDays = 30;

  constructor(activityEventService = new ActivityEventService()) {
    this.activityEventService = activityEventService;
  }

  schedule() {
    new CronJob("00 30 03 * * *", () => this.run()).start();
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.activityEventService.deleteOlderThan(before);
    console.log(`Deleted ${deleted} logs older than ${before.toISOString()}`);
  }
}
