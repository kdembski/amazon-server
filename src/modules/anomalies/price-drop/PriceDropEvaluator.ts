import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class PriceDropEvaluator extends AnomalyEvaluator {
  // Prices are newest first: the newest must be at least `dropPercent` below the lowest older one.
  isOverPercentageDifference(prices: ListingPrice[], dropPercent: number) {
    const first = prices[0].value;
    if (!first || prices.length < 2) return false;

    const lowest = prices
      .slice(1)
      .map((price) => price.value)
      .reduce((min, value) => (value.lt(min) ? value : min));
    return first.lte(lowest.times(1 - dropPercent / 100));
  }
}
