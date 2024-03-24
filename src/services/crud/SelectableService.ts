import { SelectableRepositoryI } from "@/interfaces/crud/CRUDRepository";
import { SelectableServiceI } from "@/interfaces/crud/CRUDService";

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
