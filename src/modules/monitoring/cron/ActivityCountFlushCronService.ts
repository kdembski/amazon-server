import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ActivityCountFlushCronService {
  private activityCountService;
  private logger;

  constructor(
    activityCountService = new ActivityCountService(),
    logger = SystemLogService.getInstance()
  ) {
    this.activityCountService = activityCountService;
    this.logger = logger;
  }

  // Second 30 keeps the write away from the reports that run on full minutes
  schedule() {
    new CronJob("30 * * * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ActivityCountFlushCronService", "Cron run failed", { error })
      )
    ).start();
  }

  run() {
    return this.activityCountService.flush();
  }
}
