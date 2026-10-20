import { AmazonCountryCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonCountryCreateMapper";
import { AmazonCountryUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonCountryUpdateMapper";
import { AmazonCountryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonCountryService {
  private repository;
  creatable;
  updatable;

  constructor(
    repository = new AmazonCountryRepository(),
    creatable = new CreatableService(repository, new AmazonCountryCreateMapper()),
    updatable = new UpdatableService(repository, new AmazonCountryUpdateMapper())
  ) {
    this.repository = repository;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getForScraping() {
    return this.repository.getForScraping();
  }
}
