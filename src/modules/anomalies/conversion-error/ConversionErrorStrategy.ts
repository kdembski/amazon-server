import { ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { ConversionErrorRuleI } from "@/modules/anomalies/interfaces/ConversionErrorRuleI";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";
import { ConversionErrorPercentageRule } from "@/modules/anomalies/conversion-error/ConversionErrorPercentageRule";
import { ConversionErrorRangeRule } from "@/modules/anomalies/conversion-error/ConversionErrorRangeRule";

export class ConversionErrorStrategy {
  private evaluator;

  // Each group reports at most one rule: the first one that matches.
  private ruleGroups: ConversionErrorRuleI[][] = [
    [
      new ConversionErrorPercentageRule("3", 90),
      new ConversionErrorPercentageRule("2", 70),
      new ConversionErrorPercentageRule("1", 50),
    ],
    [
      new ConversionErrorRangeRule("4", 0, 50),
      new ConversionErrorRangeRule("5", 50, 200),
      new ConversionErrorRangeRule("6", 200),
    ],
  ];

  constructor(evaluator = new ConversionErrorEvaluator()) {
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
