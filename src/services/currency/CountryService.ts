import { CountryCreateMapper } from "@/mappers/currency/CountryCreateMapper";
import { CountryUpdateMapper } from "@/mappers/currency/CountryUpdateMapper";
import { CountryRepository } from "@/repositories/currency/CountryRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

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
