import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyDtos";

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
