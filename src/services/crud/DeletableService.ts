import { DeletableRepositoryI } from "@/interfaces/crud/CRUDRepository";
import { DeletableServiceI } from "@/interfaces/crud/CRUDService";

export class DeletableService<Model> implements DeletableServiceI<Model> {
  private repository;

  constructor(repository: DeletableRepositoryI<Model>) {
    this.repository = repository;
  }

  delete(id: number) {
    return this.repository.delete(id);
  }
}
