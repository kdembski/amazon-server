import { Decimal } from "@prisma/client/runtime/client";
import { ListingPrice } from "@/modules/anomalies/types/listing-price";

// The reported price is kept per listing and country, whichever channel got it.
export interface CountryOutlierReporterI<T> {
  getReportedPrice(listing: T, price: ListingPrice): Promise<Decimal | undefined>;
  setReportedPrice(listing: T, price: ListingPrice): Promise<void>;

  report(
    listing: T,
    prices: ListingPrice[],
    channelId: number,
    difference?: number
  ): Promise<void>;

  // A dealCheck rule's channel: the marketplace analyses the deal and posts it only when worth buying.
  checkDeal(
    listing: T,
    prices: ListingPrice[],
    channelId: number,
    difference?: number
  ): Promise<void>;
}
