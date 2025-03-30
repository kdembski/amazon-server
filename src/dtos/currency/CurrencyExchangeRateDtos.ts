import { CurrencyExchangeRateRepository } from "@/repositories/currency/CurrencyExchangeRateRepository";

export interface CurrencyExchangeRateCreateDto {
  value: number;
  sourceId: number;
  targetId: number;
}

export interface CurrencyExchangeRateUpdateDto {
  value: number;
}

export type CurrencyExchangeRateSelectDto = NonNullable<
  Awaited<ReturnType<CurrencyExchangeRateRepository["getById"]>>
>;
