import { MarketplaceModule } from "@/modules/marketplaces/interfaces/MarketplaceModule";
import { AmazonAdCategoryRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdPriceRouter";
import { AmazonCountryRouteRouter } from "@/modules/marketplaces/amazon/routes/AmazonCountryRouteRouter";
import { AmazonCountryRouter } from "@/modules/marketplaces/amazon/routes/AmazonCountryRouter";
import { AmazonExclusionRuleRouter } from "@/modules/marketplaces/amazon/routes/AmazonExclusionRuleRouter";
import { AmazonExclusionRuleTarget } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleTarget";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";

export function createAmazonModule(): MarketplaceModule {
  return {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
      new AmazonExclusionRuleRouter(),
      new AmazonCountryRouteRouter(),
      new AmazonCountryRouter(),
    ],
    workerCrons: [
      new RetentionCleanupCronService("00 00 04 * * *", "Amazon ad prices", 90, new AmazonAdPriceService()),
      new RetentionCleanupCronService(
        "00 30 04 * * *",
        "Amazon ad missing routes",
        30,
        new AmazonAdMissingService()
      ),
    ],
    exclusionRuleTarget: new AmazonExclusionRuleTarget(),
    dailyReportSection: new AmazonAdDailyReportSection(),
  };
}
