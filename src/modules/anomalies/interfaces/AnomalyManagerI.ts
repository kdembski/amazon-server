import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";

export interface AnomalyManagerI {
  check(listing: Listing, countryPrices: ListingPrice[][]): Promise<void>;
}
