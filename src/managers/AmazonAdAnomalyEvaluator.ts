import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";

export class AmazonAdAnomalyEvaluator {
  isReportable(prices: AmazonAdPriceSelectDto[]) {
    return this.isCountryActive(prices) && this.isAmazonDispatch(prices);
  }

  isCountryActive(prices: AmazonAdPriceSelectDto[]) {
    return prices[0].country.active;
  }

  isAmazonDispatch(prices: AmazonAdPriceSelectDto[]) {
    const dispatchFrom = prices[0].dispatchFrom;
    return dispatchFrom && dispatchFrom === "Amazon";
  }
}
