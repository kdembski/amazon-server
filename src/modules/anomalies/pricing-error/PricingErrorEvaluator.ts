import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class PricingErrorEvaluator extends AnomalyEvaluator {
  // Prices are newest first: the newest must be at most half of the previous and of the median of all older ones.
  isOverPercentageDifference(prices: ListingPrice[]) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    const older = prices.slice(1);
    return (
      first.lte(older[0].value.times(0.5)) &&
      first.lte(this.getMedian(older).times(0.5))
    );
  }
}
