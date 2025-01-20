import { CurrencyExchangeRateCreateMapper } from "@/mappers/currency/CurrencyExchangeRateCreateMapper";
import { CurrencyExchangeRateUpdateMapper } from "@/mappers/currency/CurrencyExchangeRateUpdateMapper";
import { CurrencyExchangeRateRepository } from "@/repositories/currency/CurrencyExchangeRateRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class CurrencyExchangeRateService {
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new CurrencyExchangeRateRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new CurrencyExchangeRateCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new CurrencyExchangeRateUpdateMapper()
    )
  ) {
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }
}
