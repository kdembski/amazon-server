import { UpdatableRepositoryI } from "@/interfaces/crud/CRUDRepository";
import { UpdatableServiceI } from "@/interfaces/crud/CRUDService";

export class UpdatableService<UpdateInput, Model>
  implements UpdatableServiceI<UpdateInput, Model>
{
  private repository;

  constructor(repository: UpdatableRepositoryI<UpdateInput, Model>) {
    this.repository = repository;
  }

  update(id: number, data: UpdateInput) {
    return this.repository.update(id, data);
  }
}
