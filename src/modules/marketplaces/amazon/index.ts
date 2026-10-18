import { MarketplaceModule } from "@/modules/marketplaces/interfaces/MarketplaceModule";
import { AmazonAdCategoryRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdPriceRouter";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";

export function createAmazonModule(): MarketplaceModule {
  return {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
    ],
    searchRuleTarget: new AmazonAdRepository(),
    dailyReportSection: new AmazonAdDailyReportSection(),
  };
}
