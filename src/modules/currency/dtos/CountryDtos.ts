import { CountryRepository } from "@/modules/currency/repositories/CountryRepository";

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
