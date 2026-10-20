import { AppModule } from "@/shared/interfaces/AppModule";
import { createCurrencyModule } from "@/modules/currency";
import { createMonitoringModule } from "@/modules/monitoring";
import { createExclusionRulesModule } from "@/modules/exclusion-rules";
import { createAmazonModule } from "@/modules/marketplaces/amazon";

export function createModules(): AppModule[] {
  const currency = createCurrencyModule();
  const marketplaces = [createAmazonModule()];

  return [
    currency,
    createExclusionRulesModule(marketplaces.map((m) => m.exclusionRuleTarget)),
    createMonitoringModule([
      ...marketplaces.map((m) => m.dailyReportSection),
      currency.dailyReportSection,
    ]),
    ...marketplaces,
  ];
}
