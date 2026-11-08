import { CronJob } from "cron";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export abstract class CronService {
  protected abstract readonly cronTime: string;
  protected logger;

  constructor(logger = SystemLogService.getInstance()) {
    this.logger = logger;
  }

  schedule() {
    new CronJob(this.cronTime, async () => {
      try {
        await this.run();
      } catch (error) {
        this.logger.error(this.constructor.name, "Cron run failed", { error, ...this.getFailureContext() });
      }
    }).start();
  }

  abstract run(): Promise<unknown>;

  // Extra fields of the "Cron run failed" log
  protected getFailureContext(): Record<string, unknown> {
    return {};
  }
}
