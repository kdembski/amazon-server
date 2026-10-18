import { Decimal } from "@prisma/client/runtime/library";

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
