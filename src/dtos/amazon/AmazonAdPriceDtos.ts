import { AmazonAdPriceRepository } from "@/repositories/amazon/AmazonAdPriceRepository";

export interface AmazonAdPriceCreateDto {
  value: number;
  adId: number;
  countryId: number;
}

export interface AmazonAdPriceUpdateDto {
  value: number;
  countryId: number;
  adId: number;
}

export type AmazonAdPriceSelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdPriceRepository["getById"]>>
>;
