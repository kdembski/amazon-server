import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";

export class CountryOutlierPercentageRule implements CountryOutlierRuleI {
  readonly channel;
  private percentage;
  private evaluator;

  constructor(
    channel: string,
    percentage: number,
    evaluator = new CountryOutlierEvaluator()
  ) {
    this.channel = channel;
    this.percentage = percentage;
    this.evaluator = evaluator;
  }

  matches(prices: ListingPrice[]) {
    return this.evaluator.isOverPercentageDifference(prices, this.percentage);
  }
}
