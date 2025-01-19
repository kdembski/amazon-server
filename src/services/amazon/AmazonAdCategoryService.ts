import { AmazonAdCategoryCreateMapper } from "@/mappers/amazon/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/mappers/amazon/AmazonAdCategoryUpdateMapper";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class AmazonAdCategoryService {
  private repository;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdCategoryRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new AmazonAdCategoryCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new AmazonAdCategoryUpdateMapper()
    )
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
