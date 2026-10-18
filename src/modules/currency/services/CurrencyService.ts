import { CurrencyCreateMapper } from "@/modules/currency/mappers/CurrencyCreateMapper";
import { CurrencyUpdateMapper } from "@/modules/currency/mappers/CurrencyUpdateMapper";
import { CurrencyRepository } from "@/modules/currency/repositories/CurrencyRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

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
