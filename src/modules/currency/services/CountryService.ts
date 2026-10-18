import { CountryCreateMapper } from "@/modules/currency/mappers/CountryCreateMapper";
import { CountryUpdateMapper } from "@/modules/currency/mappers/CountryUpdateMapper";
import { CountryRepository } from "@/modules/currency/repositories/CountryRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class CountryService {
  private repository;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new CountryRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new CountryCreateMapper()),
    updatable = new UpdatableService(repository, new CountryUpdateMapper())
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }
}
