import { ListingPrice } from "@/modules/anomalies/types/listing-price";

export interface AnomalyManagerI<T> {
  check(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
