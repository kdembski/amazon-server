import { ActivityEventCreateMapper } from "@/modules/monitoring/mappers/ActivityEventCreateMapper";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { ActivityEventType } from "@prisma/client";

export class ActivityEventService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new ActivityEventRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new ActivityEventCreateMapper())
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getCount(
    type: ActivityEventType,
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
