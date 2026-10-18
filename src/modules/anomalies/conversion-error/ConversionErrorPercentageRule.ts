import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { ConversionErrorRuleI } from "@/modules/anomalies/interfaces/ConversionErrorRuleI";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";

export class ConversionErrorPercentageRule implements ConversionErrorRuleI {
  readonly channel;
  private percentage;
  private evaluator;

  constructor(
    channel: string,
    percentage: number,
    evaluator = new ConversionErrorEvaluator()
  ) {
    this.channel = channel;
    this.percentage = percentage;
    this.evaluator = evaluator;
  }

  matches(prices: ListingPrice[]) {
    return this.evaluator.isOverPercentageDifference(prices, this.percentage);
  }
}
