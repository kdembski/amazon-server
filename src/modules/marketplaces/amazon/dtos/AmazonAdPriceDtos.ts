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
