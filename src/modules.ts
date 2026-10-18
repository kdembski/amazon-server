import { AppModule } from "@/shared/interfaces/AppModule";
import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/routes/amazon/AmazonAdPriceRouter";
import { createCurrencyModule } from "@/modules/currency";
import { createMonitoringModule } from "@/modules/monitoring";
import { AmazonAdDailyReportSection } from "@/services/amazon/AmazonAdDailyReportSection";
import { createSearchRulesModule } from "@/modules/search-rules";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";

export function createModules(): AppModule[] {
  const currency = createCurrencyModule();
  const legacy: AppModule = {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
    ],
  };

  return [
    currency,
    legacy,
    createSearchRulesModule([new AmazonAdRepository()]),
    createMonitoringModule([
      new AmazonAdDailyReportSection(),
      currency.dailyReportSection,
    ]),
  ];
}
