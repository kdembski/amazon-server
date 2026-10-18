import { AppModule } from "@/shared/interfaces/AppModule";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";

export interface MarketplaceModule extends AppModule {
  searchRuleTarget: SearchRuleTarget;
  dailyReportSection: DailyReportSection;
}
