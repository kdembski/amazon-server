import { ListingPrice } from "@/modules/anomalies/interfaces/Listing";

export interface ConversionErrorRuleI {
  readonly channel: string;
  matches(prices: ListingPrice[]): boolean | undefined;
}
