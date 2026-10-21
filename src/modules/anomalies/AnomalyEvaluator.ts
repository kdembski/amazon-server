import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AnomalyEvaluator {
  isReportable(prices: ListingPrice[]) {
    return prices[0].country.active && prices[0].reportable;
  }

  protected getMedian(prices: ListingPrice[]) {
    return this.getWeightedMedian(prices, () => 1);
  }

  // `weight` gets the rank in ascending order; a cumulative weight of exactly half averages the price with the next one.
  protected getWeightedMedian(
    prices: ListingPrice[],
    weight: (rank: number, count: number) => number
  ) {
    const values = prices
      .map((price) => price.value)
      .sort((a, b) => a.comparedTo(b));
    const weights = values.map((_, rank) => weight(rank, values.length));
    const half = weights.reduce((sum, value) => sum + value, 0) / 2;
    let cumulative = 0;

    const index = weights.findIndex((value) => (cumulative += value) >= half);
    return cumulative === half
      ? values[index].plus(values[index + 1]).div(2)
      : values[index];
  }
}
