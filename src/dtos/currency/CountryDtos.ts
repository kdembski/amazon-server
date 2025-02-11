import { CountryRepository } from "@/repositories/currency/CountryRepository";

export interface CountryCreateDto {
  name: string;
  code: string;
  currencyId: number;
}

export interface CountryUpdateDto {
  name: string;
  code: string;
  currencyId: number;
}

export type CountrySelectDto = NonNullable<
  Awaited<ReturnType<CountryRepository["getById"]>>
>;
