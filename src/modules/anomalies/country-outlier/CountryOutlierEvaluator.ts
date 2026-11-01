import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class CountryOutlierEvaluator extends AnomalyEvaluator {
  // Compares the first (cheapest) price with the median of the others weighted n..1 from the cheapest.
  isOverPercentageDifference(prices: ListingPrice[], percentage: number) {
    const [first, ...rest] = prices;
    const median = this.getWeightedMedian(rest, (rank, count) => count - rank);

    return first.value.lte(median.times(1 - percentage / 100));
  }

  // `min` is inclusive and `max` exclusive, so adjacent ranges do not overlap.
  isInRange(prices: ListingPrice[], min?: number, max?: number) {
    const price = prices[0].value;
    return (min === undefined || price.gte(min)) && (max === undefined || price.lt(max));
  }
}
