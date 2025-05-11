import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyExchangeRateDtos";

export class StorageService {
  private static instance: StorageService;
  state: {
    plnExchangeRates?: CurrencyExchangeRateSelectDto[];
  } = {};

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }

    return StorageService.instance;
  }
}
