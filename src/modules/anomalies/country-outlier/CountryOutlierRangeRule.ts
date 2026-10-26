import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";

export class CountryOutlierRangeRule implements CountryOutlierRuleI {
  readonly channel;
  private min;
  private max;
  private evaluator;

  constructor(
    channel: string,
    min?: number,
    max?: number,
    evaluator = new CountryOutlierEvaluator()
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
