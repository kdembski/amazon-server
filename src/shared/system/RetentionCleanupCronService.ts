import { CronService } from "@/shared/system/CronService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export interface RetentionTarget {
  deleteOlderThan(date: Date): Promise<number>;
}

// Deletes the rows of `target` older than `retentionDays`; `label` names them in the log
export class RetentionCleanupCronService extends CronService {
  protected readonly cronTime;
  private label;
  private retentionDays;
  private target;

  constructor(
    cronTime: string,
    label: string,
    retentionDays: number,
    target: RetentionTarget,
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.cronTime = cronTime;
    this.label = label;
    this.retentionDays = retentionDays;
    this.target = target;
  }

  protected getFailureContext() {
    return { label: this.label };
  }

  async run() {
    const before = new Date();
    before.setDate(before.getDate() - this.retentionDays);

    const deleted = await this.target.deleteOlderThan(before);
    this.logger.info(
      "RetentionCleanupCronService",
      `Deleted ${deleted} ${this.label} older than ${before.toISOString()}`,
      { deleted, before, label: this.label }
    );
  }
}
