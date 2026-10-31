import { Decimal } from "@prisma/client/runtime/library";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export interface CountryOutlierReporter<T> {
  getReportedPrice(listing: T, price: ListingPrice): Promise<Decimal | undefined>;
  setReportedPrice(listing: T, price: ListingPrice): Promise<void>;

  report(
    listing: T,
    prices: ListingPrice[],
    channel: string,
    difference?: number
  ): Promise<void>;
}

export interface PriceDropReporter<T> {
  report(listing: T, countryPrices: ListingPrice[][]): Promise<void>;
}
