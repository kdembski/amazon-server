import { ListingPrice } from "@/modules/anomalies/types/listing-price";

export interface CountryOutlierRuleI {
  readonly channelId: number;
  readonly dealCheck: boolean;
  matches(prices: ListingPrice[], history: ListingPrice[]): boolean;
}
