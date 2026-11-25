import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

// Whether the cheapest price is at least the given percent below the reported one; passed only with a reported price
export type IsBelowReported = (dropSinceSentPercent: number) => boolean;

export interface CountryOutlierRuleI {
  readonly channelId: number;
  readonly dropSinceSentPercent: number;
  readonly dealCheck: boolean;
  readonly requireSent: boolean;
  matches(prices: ListingPrice[], isBelowReported?: IsBelowReported): boolean;
}
