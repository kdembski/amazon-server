import { OlxAdCategoryCreateMapper } from "@/mappers/olx/OlxAdCategoryCreateMapper";
import { OlxAdCategoryUpdateMapper } from "@/mappers/olx/OlxAdCategoryUpdateMapper";
import { OlxAdCategoryRepository } from "@/repositories/olx/OlxAdCategoryRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class OlxAdCategoryService {
  private repository;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new OlxAdCategoryRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new OlxAdCategoryCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new OlxAdCategoryUpdateMapper()
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
