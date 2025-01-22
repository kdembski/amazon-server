export interface CurrencyExchangeRateCreateDto {
  value: number;
  sourceId: number;
  targetId: number;
}

export interface CurrencyExchangeRateUpdateDto {
  value: number;
  sourceId: number;
  targetId: number;
}
