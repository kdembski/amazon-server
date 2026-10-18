import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface AnomalyManagerI<T> {
  check(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
