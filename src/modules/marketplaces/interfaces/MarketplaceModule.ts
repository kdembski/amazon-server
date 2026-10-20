import { AppModule } from "@/shared/interfaces/AppModule";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export interface MarketplaceModule extends AppModule {
  exclusionRuleTarget: ExclusionRuleTarget;
  dailyReportSection: DailyReportSection;
}
