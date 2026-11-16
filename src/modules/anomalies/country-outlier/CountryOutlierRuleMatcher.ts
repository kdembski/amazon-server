import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
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
  async getMatches(prices: ListingPrice[]) {
    if (!this.evaluator.isReportable(prices)) return [];

    const [groups, dropSinceSentPercent, minPrices] = await Promise.all([
      this.settingService.get("countryOutlier.ruleGroups"),
      this.settingService.get("countryOutlier.dropSinceSentPercent"),
      this.settingService.get("countryOutlier.minPrices"),
    ]);
    if (!groups || dropSinceSentPercent === undefined || minPrices === undefined) return [];

    return groups.flatMap((group) => {
      const rule = group
        .map((setting) => {
          return new CountryOutlierRule(setting, dropSinceSentPercent, minPrices, this.evaluator);
        })
        .find((rule) => rule.matches(prices));
      return rule ? [rule] : [];
    });
  }
}
