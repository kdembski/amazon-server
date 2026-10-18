import { AppModule } from "@/shared/interfaces/AppModule";
import { DailyReportSection } from "@/modules/monitoring/interfaces/DailyReportSection";
import { CountryRouter } from "@/modules/currency/routes/CountryRouter";
import { CurrencyRouter } from "@/modules/currency/routes/CurrencyRouter";
import { CurrencyExchangeRateRouter } from "@/modules/currency/routes/CurrencyExchangeRateRouter";
import { CurrencyExchangeRateCronService } from "@/modules/currency/cron/CurrencyExchangeRateCronService";
import { ExchangeRateDailyReportSection } from "@/modules/currency/services/ExchangeRateDailyReportSection";

export function createCurrencyModule(): AppModule & {
  dailyReportSection: DailyReportSection;
} {
  return {
    routers: [
      new CountryRouter(),
      new CurrencyRouter(),
      new CurrencyExchangeRateRouter(),
    ],
    crons: [new CurrencyExchangeRateCronService()],
    dailyReportSection: new ExchangeRateDailyReportSection(),
  };
}
