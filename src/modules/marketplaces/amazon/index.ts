import { MarketplaceModule } from "@/modules/marketplaces/interfaces/MarketplaceModule";
import { AmazonAdCategoryRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdPriceRouter";
import { AmazonCountryRouter } from "@/modules/marketplaces/amazon/routes/AmazonCountryRouter";
import { AmazonExclusionRuleRouter } from "@/modules/marketplaces/amazon/routes/AmazonExclusionRuleRouter";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";

export function createAmazonModule(): MarketplaceModule {
  return {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
      new AmazonExclusionRuleRouter(),
      new AmazonCountryRouter(),
    ],
    exclusionRuleTarget: new AmazonAdRepository(),
    dailyReportSection: new AmazonAdDailyReportSection(),
  };
}
