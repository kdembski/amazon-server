import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorRuleI } from "@/interfaces/AmazonAdConversionErrorRuleI";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";

export class AmazonAdConversionErrorPercentageRule
  implements AmazonAdConversionErrorRuleI
{
  readonly channel;
  private percentage;
  private evaluator;

  constructor(
    channel: string,
    percentage: number,
    evaluator = new AmazonAdConversionErrorEvaluator()
  ) {
    this.channel = channel;
    this.percentage = percentage;
    this.evaluator = evaluator;
  }

  matches(prices: AmazonAdPriceSelectDto[]) {
    return this.evaluator.isOverPercentageDifference(prices, this.percentage);
  }
}
