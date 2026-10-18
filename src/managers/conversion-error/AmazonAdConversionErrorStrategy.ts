import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorRuleI } from "@/interfaces/AmazonAdConversionErrorRuleI";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { AmazonAdConversionErrorPercentageRule } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageRule";
import { AmazonAdConversionErrorRangeRule } from "@/managers/conversion-error/AmazonAdConversionErrorRangeRule";

export class AmazonAdConversionErrorStrategy {
  private evaluator;

  // Each group reports at most one rule: the first one that matches.
  private ruleGroups: AmazonAdConversionErrorRuleI[][] = [
    [
      new AmazonAdConversionErrorPercentageRule("3", 90),
      new AmazonAdConversionErrorPercentageRule("2", 70),
      new AmazonAdConversionErrorPercentageRule("1", 50),
    ],
    [
      new AmazonAdConversionErrorRangeRule("4", 0, 50),
      new AmazonAdConversionErrorRangeRule("5", 50, 200),
      new AmazonAdConversionErrorRangeRule("6", 200),
    ],
  ];

  constructor(evaluator = new AmazonAdConversionErrorEvaluator()) {
    this.evaluator = evaluator;
  }

  getMatchingRules(prices: AmazonAdPriceSelectDto[]) {
    if (!this.evaluator.isReportable(prices)) return [];

    return this.ruleGroups.flatMap((group) => {
      const rule = group.find((rule) => rule.matches(prices));
      return rule ? [rule] : [];
    });
  }
}
