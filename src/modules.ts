import { AppModule } from "@/shared/interfaces/AppModule";
import { AmazonAdCategoryRouter } from "@/routes/amazon/AmazonAdCategoryRouter";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonAdPriceRouter } from "@/routes/amazon/AmazonAdPriceRouter";
import { CountryRouter } from "@/routes/currency/CountryRouter";
import { CurrencyRouter } from "@/routes/currency/CurrencyRouter";
import { CurrencyExchangeRateRouter } from "@/routes/currency/CurrencyExchangeRateRouter";
import { ScraperStatusRouter } from "@/routes/ScraperStatusRouter";
import { CurrencyExchangeRateCronService } from "@/services/cron/CurrencyExchangeRateCronService";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/services/cron/DailyStatsCronService";
import { LogCleanupCronService } from "@/services/cron/LogCleanupCronService";
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
      new ScraperStatusRouter(),
    ],
    crons: [
      new CurrencyExchangeRateCronService(),
      new HourlyStatsCronService(),
      new DailyStatsCronService(),
      new LogCleanupCronService(),
      new SearchRuleMatchCronService(),
    ],
  };

  return [legacy];
}
