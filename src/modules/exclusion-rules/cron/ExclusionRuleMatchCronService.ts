import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { CronJob } from "cron";

export class ExclusionRuleMatchCronService {
  private matchService;

  constructor(matchService: ExclusionRuleMatchService) {
    this.matchService = matchService;
  }

  schedule() {
    new CronJob("00 * * * * *", () => this.run()).start();
  }

  run() {
    return this.matchService.sync();
  }
}
