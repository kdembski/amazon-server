import { Decimal } from "@prisma/client/runtime/library";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

// The reported price is kept per listing, country and channel.
export interface CountryOutlierReporter<T> {
  getReportedPrice(
    listing: T,
    price: ListingPrice,
    channelId: number
  ): Promise<Decimal | undefined>;
  setReportedPrice(listing: T, price: ListingPrice, channelId: number): Promise<void>;

  report(
    listing: T,
    prices: ListingPrice[],
    channelId: number,
    difference?: number
  ): Promise<void>;
}

export interface PriceDropReporter<T> {
  report(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
