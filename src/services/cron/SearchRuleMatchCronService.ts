import { SearchRuleMatchService } from "@/services/search-rule/SearchRuleMatchService";
import { CronJob } from "cron";

export class SearchRuleMatchCronService {
  private matchService;

  constructor(matchService = new SearchRuleMatchService()) {
    this.matchService = matchService;
  }

  schedule() {
    new CronJob("00 * * * * *", () => this.run()).start();
  }

  run() {
    return this.matchService.sync();
  }
}
