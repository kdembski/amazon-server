import { CurrencyCreateMapper } from "@/mappers/currency/CurrencyCreateMapper";
import { CurrencyUpdateMapper } from "@/mappers/currency/CurrencyUpdateMapper";
import { CurrencyRepository } from "@/repositories/currency/CurrencyRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class CurrencyService {
  private repository;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new CurrencyRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new CurrencyCreateMapper()),
    updatable = new UpdatableService(repository, new CurrencyUpdateMapper())
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getByCode(code: string) {
    return this.repository.getByCode(code);
  }
}
