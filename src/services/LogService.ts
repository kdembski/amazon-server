import { LogCreateMapper } from "@/mappers/LogCreateMapper";
import { LogRepository } from "@/repositories/LogRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";

export class LogService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new LogRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new LogCreateMapper())
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getByEvent(event: string) {
    return this.repository.getByEvent(event);
  }
}
