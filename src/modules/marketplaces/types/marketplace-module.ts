import { AppModule } from "@/shared/types/app-module";
import { ExclusionRuleTargetI } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTargetI";
import { DailyReportSectionI } from "@/modules/monitoring/interfaces/DailyReportSectionI";

export interface MarketplaceModule extends AppModule {
  exclusionRuleTarget: ExclusionRuleTargetI;
  dailyReportSection: DailyReportSectionI;
}
