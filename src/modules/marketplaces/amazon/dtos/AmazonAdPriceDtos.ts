import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";

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
