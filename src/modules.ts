import { AppModule } from "@/shared/interfaces/AppModule";
import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/routes/amazon/AmazonAdPriceRouter";
import { CountryRouter } from "@/routes/currency/CountryRouter";
import { CurrencyRouter } from "@/routes/currency/CurrencyRouter";
import { CurrencyExchangeRateRouter } from "@/routes/currency/CurrencyExchangeRateRouter";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { createMonitoringModule } from "@/modules/monitoring";
import { AmazonAdDailyReportSection } from "@/services/amazon/AmazonAdDailyReportSection";
import { ExchangeRateDailyReportSection } from "@/services/currency/ExchangeRateDailyReportSection";
import { SearchRuleMatchCronService } from "@/services/cron/SearchRuleMatchCronService";

export function createModules(): AppModule[] {
  const legacy: AppModule = {
    routers: [
      new AmazonAdCategoryRouter(),
      new AmazonAdRouter(),
      new AmazonAdPriceRouter(),
      new CountryRouter(),
      new CurrencyRouter(),
      new CurrencyExchangeRateRouter(),
    ],
    crons: [
      new CurrencyExchangeRateCronService(),
      new SearchRuleMatchCronService(),
    ],
  };

  return [
    legacy,
    createMonitoringModule([
      new AmazonAdDailyReportSection(),
      new ExchangeRateDailyReportSection(),
    ]),
  ];
}
