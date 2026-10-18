import { CurrencyExchangeRateSelectDto } from "@/modules/currency/dtos/CurrencyExchangeRateDtos";

export class PlnExchangeRateCache {
  private static instance: PlnExchangeRateCache;
  rates?: CurrencyExchangeRateSelectDto[];

  private constructor() {}

  public static getInstance(): PlnExchangeRateCache {
    if (!PlnExchangeRateCache.instance) {
      PlnExchangeRateCache.instance = new PlnExchangeRateCache();
    }

    return PlnExchangeRateCache.instance;
  }
}
