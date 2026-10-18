import { ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { ConversionErrorRuleI } from "@/modules/anomalies/interfaces/ConversionErrorRuleI";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";

export class ConversionErrorRangeRule implements ConversionErrorRuleI {
  readonly channel;
  private min;
  private max;
  private evaluator;

  constructor(
    channel: string,
    min?: number,
    max?: number,
    evaluator = new ConversionErrorEvaluator()
  ) {
    this.channel = channel;
    this.min = min;
    this.max = max;
    this.evaluator = evaluator;
  }

  matches(prices: ListingPrice[]) {
    return (
      this.evaluator.isOverPercentageDifference(prices, 70) &&
      this.evaluator.isInRange(prices, this.min, this.max)
    );
  }
}
