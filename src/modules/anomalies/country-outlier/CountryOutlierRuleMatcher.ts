import { ListingPrice } from "@/modules/anomalies/types/listing-price";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { CountryOutlierRule } from "@/modules/anomalies/country-outlier/CountryOutlierRule";
import { SettingService } from "@/modules/settings/services/SettingService";

export class CountryOutlierRuleMatcher {
  private settingService;
  private evaluator;

  constructor(
    settingService = new SettingService(),
    evaluator = new CountryOutlierEvaluator()
  ) {
    this.settingService = settingService;
    this.evaluator = evaluator;
  }

  // Each group reports at most one rule: the first one that matches.
  async getMatches(prices: ListingPrice[], history: ListingPrice[]) {
    if (!this.evaluator.isReportable(prices)) return [];

    const [groups, minPrices] = await Promise.all([
      this.settingService.get("countryOutlier.ruleGroups"),
      this.settingService.get("countryOutlier.minPrices"),
    ]);
    if (!groups || minPrices === undefined) return [];

    return groups.flatMap((group) => {
      const rule = group
        .map((setting) => new CountryOutlierRule(setting, minPrices, this.evaluator))
        .find((rule) => rule.matches(prices, history));
      return rule ? [rule] : [];
    });
  }
}
