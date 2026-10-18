import { AppModule } from "@/shared/interfaces/AppModule";
import { createCurrencyModule } from "@/modules/currency";
import { createMonitoringModule } from "@/modules/monitoring";
import { createSearchRulesModule } from "@/modules/search-rules";
import { createAmazonModule } from "@/modules/marketplaces/amazon";

export function createModules(): AppModule[] {
  const currency = createCurrencyModule();
  const marketplaces = [createAmazonModule()];

  return [
    currency,
    createSearchRulesModule(marketplaces.map((m) => m.searchRuleTarget)),
    createMonitoringModule([
      ...marketplaces.map((m) => m.dailyReportSection),
      currency.dailyReportSection,
    ]),
    ...marketplaces,
  ];
}
