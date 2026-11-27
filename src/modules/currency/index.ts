import { AppModule } from "@/shared/types/app-module";
import { DailyReportSectionI } from "@/modules/monitoring/interfaces/DailyReportSectionI";
import { CountryRouter } from "@/modules/currency/routes/CountryRouter";
import { CurrencyRouter } from "@/modules/currency/routes/CurrencyRouter";
import { CurrencyExchangeRateRouter } from "@/modules/currency/routes/CurrencyExchangeRateRouter";
import { CurrencyExchangeRateCronService } from "@/modules/currency/cron/CurrencyExchangeRateCronService";
import { ExchangeRateDailyReportSection } from "@/modules/currency/services/ExchangeRateDailyReportSection";

export function createCurrencyModule(): AppModule & {
  dailyReportSection: DailyReportSectionI;
} {
  return {
    routers: [
      new CountryRouter(),
      new CurrencyRouter(),
      new CurrencyExchangeRateRouter(),
    ],
    workerCrons: [new CurrencyExchangeRateCronService()],
    dailyReportSection: new ExchangeRateDailyReportSection(),
  };
}
