export type { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface Listing {
  name: string;
  externalId: string;
  image: string;
  categoryName: string;
  getUrl(countryCode: string): string;
}
