import { ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class PricingErrorEvaluator extends AnomalyEvaluator {
  isOverPercentageDifference(prices: ListingPrice[]) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    return prices.every((price, i) => {
      if (i === 0) return true;
      if (i === 1) return first.lte(price.value.times(0.5));
      return first.lt(price.value);
    });
  }
}
