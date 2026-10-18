import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface ConversionErrorReporter<T> {
  report(listing: T, prices: ListingPrice[], channel: string): Promise<void>;
}

export interface PricingErrorReporter<T> {
  report(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
