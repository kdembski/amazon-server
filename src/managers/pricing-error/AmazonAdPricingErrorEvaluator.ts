import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdAnomalyEvaluator } from "@/managers/AmazonAdAnomalyEvaluator";

export class AmazonAdPricingErrorEvaluator extends AmazonAdAnomalyEvaluator {
  isOverPercentageDifference(prices: AmazonAdPriceSelectDto[]) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    return prices.every((price, i) => {
      if (i === 0) return true;
      if (i === 1) return first.lte(price.value.times(0.5));
      return first.lt(price.value);
    });
  }
}
