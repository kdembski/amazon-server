import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AnomalyEvaluator {
  isReportable(prices: ListingPrice[]) {
    return prices[0].country.active && prices[0].reportable;
  }
}
