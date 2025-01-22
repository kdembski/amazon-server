import { Prisma } from "@prisma/client";

export interface AmazonAdPriceCreateDto {
  value: number;
  currencyId: number;
  adId: number;
  country: {
    name: string;
    code: string;
  };
}

export interface AmazonAdPriceUpdateDto {
  value: number;
  currencyId: number;
  adId: number;
}
