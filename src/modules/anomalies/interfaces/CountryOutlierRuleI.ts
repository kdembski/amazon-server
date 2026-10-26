import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface CountryOutlierRuleI {
  readonly channel: string;
  matches(prices: ListingPrice[]): boolean | undefined;
}
