import { SelectableRepositoryI } from "@/shared/crud/interfaces/CRUDRepository";
import { SelectableServiceI } from "@/shared/crud/interfaces/CRUDService";

export class SelectableService<SelectResult>
  implements SelectableServiceI<SelectResult>
{
  private repository;

  constructor(repository: SelectableRepositoryI<SelectResult>) {
    this.repository = repository;
  }

  getById(id: number) {
    return this.repository.getById(id);
  }
}
