import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class PriceDropEvaluator extends AnomalyEvaluator {
  // Prices are newest first: the newest must be at least `dropPercent` below the previous one and the median of all older ones.
  isOverPercentageDifference(prices: ListingPrice[], dropPercent: number) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    const older = prices.slice(1);
    const ratio = 1 - dropPercent / 100;
    return (
      first.lte(older[0].value.times(ratio)) &&
      first.lte(this.getMedian(older).times(ratio))
    );
  }
}
