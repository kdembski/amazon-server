import { CurrencyRepository } from "@/modules/currency/repositories/CurrencyRepository";

export interface CurrencyCreateDto {
  name: string;
  code: string;
  symbol: string;
}

export interface CurrencyUpdateDto {
  name: string;
  code: string;
  symbol: string;
}

export type CurrencySelectDto = NonNullable<
  Awaited<ReturnType<CurrencyRepository["getById"]>>
>;
