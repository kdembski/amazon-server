import { ListingPrice } from "@/modules/anomalies/types/listing-price";

export interface PriceDropReporterI<T> {
  report(listing: T, countryPrices: ListingPrice[][], channelId: number): Promise<void>;
  // A dealCheck rule's channel: the marketplace analyses the deal and posts it only when worth buying.
  checkDeal(listing: T, countryPrices: ListingPrice[][], channelId: number): Promise<void>;
}
