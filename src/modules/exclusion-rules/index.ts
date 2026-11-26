import { AppModule } from "@/shared/types/app-module";
import { ExclusionRuleTargetI } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTargetI";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { ExclusionRuleMatchCronService } from "@/modules/exclusion-rules/cron/ExclusionRuleMatchCronService";

export function createExclusionRulesModule(targets: ExclusionRuleTargetI[]): AppModule {
  return {
    workerCrons: [new ExclusionRuleMatchCronService(new ExclusionRuleMatchService(targets))],
  };
}
