import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { CountryOutlierPercentageRule } from "@/modules/anomalies/country-outlier/CountryOutlierPercentageRule";
import { CountryOutlierRangeRule } from "@/modules/anomalies/country-outlier/CountryOutlierRangeRule";

export class CountryOutlierStrategy {
  private evaluator;

  // Each group reports at most one rule: the first one that matches.
  private ruleGroups: CountryOutlierRuleI[][] = [
    [
      new CountryOutlierPercentageRule("3", 90),
      new CountryOutlierPercentageRule("2", 70),
      new CountryOutlierPercentageRule("1", 50),
    ],
    [
      new CountryOutlierRangeRule("4", 0, 50),
      new CountryOutlierRangeRule("5", 50, 200),
      new CountryOutlierRangeRule("6", 200),
    ],
  ];

  constructor(evaluator = new CountryOutlierEvaluator()) {
    this.evaluator = evaluator;
  }

  getMatchingRules(prices: ListingPrice[]) {
    if (!this.evaluator.isReportable(prices)) return [];

    return this.ruleGroups.flatMap((group) => {
      const rule = group.find((rule) => rule.matches(prices));
      return rule ? [rule] : [];
    });
  }
}
