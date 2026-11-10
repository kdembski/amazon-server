import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";

export interface AmazonCountryCreateDto {
  countryId: number;
  tld: string;
  scraped: boolean;
  active: boolean;
}

export interface AmazonCountryUpdateDto {
  tld: string;
  scraped: boolean;
  active: boolean;
}

export type AmazonCountrySelectDto = NonNullable<
  Awaited<ReturnType<AmazonCountryRepository["getById"]>>
>;
