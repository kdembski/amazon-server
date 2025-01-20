export interface CurrencyExchangeRateCreateDto {
  rate: number;
  sourceId: number;
  targetId: number;
}

export interface CurrencyExchangeRateUpdateDto {
  rate: number;
  sourceId: number;
  targetId: number;
}
