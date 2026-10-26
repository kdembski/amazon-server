import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface CountryOutlierReporter<T> {
  report(listing: T, prices: ListingPrice[], channel: string): Promise<void>;
}

export interface PriceDropReporter<T> {
  report(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
