import { AmazonCountryRouteCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonCountryRouteCreateMapper";
import { AmazonCountryRouteUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonCountryRouteUpdateMapper";
import { AmazonCountryRouteRepository } from "@/modules/marketplaces/amazon/repositories/AmazonCountryRouteRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonCountryRouteService {
  private repository;
  creatable;
  updatable;
  deletable;

  constructor(
    repository = new AmazonCountryRouteRepository(),
    creatable = new CreatableService(repository, new AmazonCountryRouteCreateMapper()),
    updatable = new UpdatableService(repository, new AmazonCountryRouteUpdateMapper()),
    deletable = new DeletableService(repository)
  ) {
    this.repository = repository;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }

  getAll() {
    return this.repository.getAll();
  }
}
