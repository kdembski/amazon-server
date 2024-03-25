import { OlxProductCreateDtoCreateInputMapper } from "@/mappers/olx/OlxProductCreateDtoCreateInputMapper";
import { OlxProductUpdateDtoUpdateInputMapper } from "@/mappers/olx/OlxProductUpdateDtoUpdateInputMapper";
import { OlxProductRepository } from "@/repositories/olx/OlxProductRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class OlxProductService {
  private repository;
  private createMapper;
  private updateMapper;
  getById;
  create;
  update;
  delete;

  constructor(
    repository = new OlxProductRepository(),
    createMapper = new OlxProductCreateDtoCreateInputMapper(),
    updateMapper = new OlxProductUpdateDtoUpdateInputMapper(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, createMapper),
    updatable = new UpdatableService(repository, updateMapper)
  ) {
    this.repository = repository;
    this.createMapper = createMapper;
    this.updateMapper = updateMapper;
    this.getById = selectable.getById;
    this.create = creatable.create;
    this.update = updatable.update;
    this.delete = deletable.delete;
  }
}
