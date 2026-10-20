import { AppModule } from "@/shared/interfaces/AppModule";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { ExclusionRuleMatchCronService } from "@/modules/exclusion-rules/cron/ExclusionRuleMatchCronService";

export function createExclusionRulesModule(targets: ExclusionRuleTarget[]): AppModule {
  return {
    crons: [new ExclusionRuleMatchCronService(new ExclusionRuleMatchService(targets))],
  };
}
