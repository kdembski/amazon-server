import { OlxProductCreateMapper } from "@/mappers/olx/OlxProductCreateMapper";
import { OlxProductUpdateMapper } from "@/mappers/olx/OlxProductUpdateMapper";
import { OlxProductRepository } from "@/repositories/olx/OlxProductRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class OlxProductService {
  private repository;
  selectable;
  creatable;
  updatable;
  deletable;

  constructor(
    repository = new OlxProductRepository(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new OlxProductCreateMapper()),
    updatable = new UpdatableService(repository, new OlxProductUpdateMapper())
  ) {
    this.repository = repository;
    this.selectable = selectable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }
}
