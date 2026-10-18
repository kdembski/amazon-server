import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";

export class ConversionErrorEvaluator extends AnomalyEvaluator {
  isOverPercentageDifference(prices: ListingPrice[], percentage: number) {
    const firstPrice = prices[0].value;
    const secondPrice = prices[1].value;

    return firstPrice.lte(secondPrice.times(1 - percentage / 100));
  }

  isInRange(prices: ListingPrice[], min?: number, max?: number) {
    const price = prices?.[0].value;

    if (!price) return;
    if (min && max) return price.gte(min) && price.lte(max);
    if (min) return price.gte(min);
    if (max) return price.lte(max);
  }
}
