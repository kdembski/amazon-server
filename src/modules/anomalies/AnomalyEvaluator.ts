import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AnomalyEvaluator {
  isReportable(prices: ListingPrice[]) {
    return prices[0].country.active && prices[0].reportable;
  }

  protected getMedian(prices: ListingPrice[]) {
    const values = prices
      .map((price) => price.value)
      .sort((a, b) => a.comparedTo(b));
    const middle = Math.floor(values.length / 2);

    return values.length % 2
      ? values[middle]
      : values[middle - 1].plus(values[middle]).div(2);
  }
}
