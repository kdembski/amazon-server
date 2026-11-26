import { Prisma } from "@prisma/client";

// A row of AmazonAdPriceRepository.getComparisonByAd; MySQL returns `active` of a raw query as 0/1
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
