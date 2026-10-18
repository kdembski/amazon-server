import { AppModule } from "@/shared/interfaces/AppModule";
import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/routes/amazon/AmazonAdPriceRouter";
import { createCurrencyModule } from "@/modules/currency";
import { createMonitoringModule } from "@/modules/monitoring";
import { AmazonAdDailyReportSection } from "@/services/amazon/AmazonAdDailyReportSection";
import { SearchRuleMatchCronService } from "@/services/cron/SearchRuleMatchCronService";

export function createModules(): AppModule[] {
  const currency = createCurrencyModule();
  const legacy: AppModule = {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
    ],
    crons: [new SearchRuleMatchCronService()],
  };

  return [
    currency,
    legacy,
    createMonitoringModule([
      new AmazonAdDailyReportSection(),
      currency.dailyReportSection,
    ]),
  ];
}
