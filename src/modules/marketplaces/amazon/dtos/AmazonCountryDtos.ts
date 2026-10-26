import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";

export interface AmazonCountryCreateDto {
  countryId: number;
  tld: string;
  scraped: boolean;
  active: boolean;
  proxyType: string;
  priority: number;
}

export interface AmazonCountryUpdateDto {
  tld: string;
  scraped: boolean;
  active: boolean;
  proxyType: string;
  priority: number;
}

export type AmazonCountrySelectDto = NonNullable<
  Awaited<ReturnType<AmazonCountryRepository["getById"]>>
>;
