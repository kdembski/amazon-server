import { CountrySelectDto } from "@/dtos/currency/CountryDtos";
import { AmazonAdPriceRepository } from "@/repositories/amazon/AmazonAdPriceRepository";

export interface AmazonAdPriceCreateDto {
  value: number;
  adId: number;
  countryId: number;
  country: CountrySelectDto;
}

export interface AmazonAdPriceUpdateDto {
  value: number;
  countryId: number;
  adId: number;
}

export type AmazonAdPriceSelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdPriceRepository["getById"]>>
>;
