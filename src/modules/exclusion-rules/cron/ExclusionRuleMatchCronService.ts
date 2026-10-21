import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronJob } from "cron";

export class ExclusionRuleMatchCronService {
  private matchService;
  private logger;

  constructor(
    matchService: ExclusionRuleMatchService,
    logger = SystemLogService.getInstance()
  ) {
    this.matchService = matchService;
    this.logger = logger;
  }

  schedule() {
    new CronJob("00 * * * * *", () =>
      this.run().catch((error) =>
        this.logger.error("ExclusionRuleMatchCronService", "Cron run failed", { error })
      )
    ).start();
  }

  run() {
    return this.matchService.sync();
  }
}
