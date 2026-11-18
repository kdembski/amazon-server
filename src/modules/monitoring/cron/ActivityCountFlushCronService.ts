import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronService } from "@/shared/system/CronService";

export class ActivityCountFlushCronService extends CronService {
  // Second 30 keeps the write away from the reports that run on full minutes
  protected readonly cronTime = "30 * * * * *";
  private activityCountService;

  constructor(
    activityCountService = new ActivityCountService(),
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.activityCountService = activityCountService;
  }

  protected getFailureContext() {
    return { pendingCount: this.activityCountService.getPendingCount() };
  }

  run() {
    return this.activityCountService.flush();
  }
}
