import { DeletableRepositoryI } from "@/shared/crud/interfaces/CRUDRepository";
import { DeletableServiceI } from "@/shared/crud/interfaces/CRUDService";

export class DeletableService<Model> implements DeletableServiceI<Model> {
  private repository;

  constructor(repository: DeletableRepositoryI<Model>) {
    this.repository = repository;
  }

  delete(id: number) {
    return this.repository.delete(id);
  }
}
