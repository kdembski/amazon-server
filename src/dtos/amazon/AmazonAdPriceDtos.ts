import { CountrySelectDto } from "@/dtos/currency/CountryDtos";
import { AmazonAdPriceRepository } from "@/repositories/amazon/AmazonAdPriceRepository";

export interface AmazonAdPriceCreateDto {
  value: number;
  currencyId: number;
  adId: number;
  country: CountrySelectDto;
}

export interface AmazonAdPriceUpdateDto {
  value: number;
  currencyId: number;
  adId: number;
}

export type AmazonAdPriceSelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdPriceRepository["getById"]>>
>;
