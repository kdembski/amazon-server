import { OlxAdCategoryCreateMapper } from "@/mappers/olx/OlxAdCategoryCreateMapper";
import { OlxAdCategoryRepository } from "@/repositories/olx/OlxAdCategoryRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";

export class OlxAdCategoryService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new OlxAdCategoryRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new OlxAdCategoryCreateMapper()
    )
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getAll() {
    return this.repository.getAll();
  }
}
