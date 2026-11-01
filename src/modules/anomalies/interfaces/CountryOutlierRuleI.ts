import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface CountryOutlierRuleI {
  readonly channelId: number;
  readonly dropSinceSentPercent: number;
  matches(prices: ListingPrice[]): boolean;
}
