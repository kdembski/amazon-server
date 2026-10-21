import { Decimal } from "@prisma/client/runtime/library";

export interface ListingPrice {
  value: Decimal;
  createdAt: Date;
  scraped: boolean;
  reportable: boolean;
  url: string;
  country: {
    name: string;
    code: string;
    active: boolean;
    currencyId: number;
    currencyCode: string;
  };
}
