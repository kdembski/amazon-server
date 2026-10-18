import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface ConversionErrorRuleI {
  readonly channel: string;
  matches(prices: ListingPrice[]): boolean | undefined;
}
