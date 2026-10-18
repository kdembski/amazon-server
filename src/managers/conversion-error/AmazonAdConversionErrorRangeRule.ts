import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorRuleI } from "@/interfaces/AmazonAdConversionErrorRuleI";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";

export class AmazonAdConversionErrorRangeRule
  implements AmazonAdConversionErrorRuleI
{
  readonly channel;
  private min;
  private max;
  private evaluator;

  constructor(
    channel: string,
    min?: number,
    max?: number,
    evaluator = new AmazonAdConversionErrorEvaluator()
  ) {
    this.channel = channel;
    this.min = min;
    this.max = max;
    this.evaluator = evaluator;
  }

  matches(prices: AmazonAdPriceSelectDto[]) {
    return (
      this.evaluator.isOverPercentageDifference(prices, 70) &&
      this.evaluator.isInRange(prices, this.min, this.max)
    );
  }
}
