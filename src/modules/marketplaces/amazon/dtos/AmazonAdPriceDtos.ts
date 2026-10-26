import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { Prisma } from "@prisma/client";

export interface AmazonAdPriceCreateDto {
  value: number;
  adId: number;
  countryId: number;
  dispatchFrom: string | undefined;
}

export interface AmazonAdPriceUpdateDto {
  value: number;
  countryId: number;
  adId: number;
}

export type AmazonAdPriceSelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdPriceRepository["getById"]>>
>;

// A row of AmazonAdPriceRepository.getRecentByAd; MySQL returns `active` of a raw query as 0/1
export interface AmazonAdRecentPriceRow {
  id: number;
  adId: number;
  countryId: number;
  value: Prisma.Decimal;
  dispatchFrom: string | null;
  createdAt: Date;
  updatedAt: Date;
  tld: string;
  active: boolean | number;
  countryName: string;
  countryCode: string;
  currencyId: number;
  currencyName: string;
  currencyCode: string;
  currencySymbol: string;
  currencyCreatedAt: Date;
  currencyUpdatedAt: Date;
}
