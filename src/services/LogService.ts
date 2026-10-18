import { LogCreateMapper } from "@/mappers/LogCreateMapper";
import { LogRepository } from "@/repositories/LogRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";

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

  getCountByEvent(event: string, from?: Date, to?: Date) {
    return this.repository.getCountByEvent(event, from, to);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
