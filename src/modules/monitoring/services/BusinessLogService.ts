import { BusinessLogCreateMapper } from "@/modules/monitoring/mappers/BusinessLogCreateMapper";
import { BusinessLogRepository } from "@/modules/monitoring/repositories/BusinessLogRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { BusinessLogType } from "@prisma/client";

export class BusinessLogService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new BusinessLogRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new BusinessLogCreateMapper())
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getCount(
    type: BusinessLogType,
    from?: Date,
    to?: Date,
    channel?: string
  ) {
    return this.repository.getCount(type, from, to, channel);
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
