import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { CronService } from "@/shared/system/CronService";

export class ExclusionRuleMatchCronService extends CronService {
  protected readonly cronTime = "00 * * * * *";
  private matchService;

  constructor(
    matchService: ExclusionRuleMatchService,
    logger = SystemLogService.getInstance()
  ) {
    super(logger);
    this.matchService = matchService;
  }

  run() {
    return this.matchService.sync();
  }
}
