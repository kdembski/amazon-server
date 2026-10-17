import { SearchRuleCreateMapper } from "@/mappers/search-rule/SearchRuleCreateMapper";
import { SearchRuleRepository } from "@/repositories/search-rule/SearchRuleRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";

export class SearchRuleService {
  private repository;
  deletable;
  creatable;

  constructor(
    repository = new SearchRuleRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new SearchRuleCreateMapper()
    )
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getByValue(value: string) {
    return this.repository.getByValue(value);
  }
}
