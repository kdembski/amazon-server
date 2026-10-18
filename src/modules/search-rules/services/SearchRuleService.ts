import { SearchRuleRepository } from "@/modules/search-rules/repositories/SearchRuleRepository";

export class SearchRuleService {
  private repository;

  constructor(repository = new SearchRuleRepository()) {
    this.repository = repository;
  }

  getAll() {
    return this.repository.getAll();
  }
}
