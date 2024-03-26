import { OlxProductAdCreateMapper } from "@/mappers/olx/OlxProductAdCreateMapper";
import { OlxProductAdRepository } from "@/repositories/olx/OlxProductAdRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";

export class OlxProductAdService {
  private repository;
  selectable;
  creatable;
  deletable;

  constructor(
    repository = new OlxProductAdRepository(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new OlxProductAdCreateMapper())
  ) {
    this.repository = repository;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
  }
}
