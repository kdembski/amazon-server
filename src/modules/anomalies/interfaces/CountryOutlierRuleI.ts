import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface CountryOutlierRuleI {
  readonly channelId: number;
  readonly dealCheck: boolean;
  matches(prices: ListingPrice[], history: ListingPrice[]): boolean;
}
