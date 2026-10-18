import { AppModule } from "@/shared/interfaces/AppModule";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { SearchRuleMatchCronService } from "@/modules/search-rules/cron/SearchRuleMatchCronService";

export function createSearchRulesModule(targets: SearchRuleTarget[]): AppModule {
  return {
    crons: [new SearchRuleMatchCronService(new SearchRuleMatchService(targets))],
  };
}
