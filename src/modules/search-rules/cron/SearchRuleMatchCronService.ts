import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { CronJob } from "cron";

export class SearchRuleMatchCronService {
  private matchService;

  constructor(matchService: SearchRuleMatchService) {
    this.matchService = matchService;
  }

  schedule() {
    new CronJob("00 * * * * *", () => this.run()).start();
  }

  run() {
    return this.matchService.sync();
  }
}
