import { Decimal } from "@prisma/client/runtime/library";

export interface Listing {
  name: string;
  externalId: string;
  image: string;
  categoryName: string;
  getUrl(countryCode: string): string;
}

export interface ListingPrice {
  value: Decimal;
  createdAt: Date;
  reportable: boolean;
  country: {
    name: string;
    code: string;
    active: boolean;
    currencyId: number;
    currencyCode: string;
  };
}
