import { OlxAdCreateDtoCreateInputMapper } from "@/mappers/olx/OlxAdCreateDtoCreateInputMapper";
import { OlxAdRepository } from "@/repositories/olx/OlxAdRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";

export class OlxAdService {
  private repository;
  private mapper;
  getById;
  create;
  delete;

  constructor(
    repository = new OlxAdRepository(),
    mapper = new OlxAdCreateDtoCreateInputMapper(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, mapper)
  ) {
    this.repository = repository;
    this.mapper = mapper;
    this.getById = selectable.getById;
    this.create = creatable.create;
    this.delete = deletable.delete;
  }

  getAll() {
    return this.repository.getAll();
  }
}
