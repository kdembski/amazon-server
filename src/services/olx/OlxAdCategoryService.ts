import { OlxAdCategoryRepository } from "@/repositories/olx/OlxAdCategoryRepository";

export class OlxAdCategoryService {
  private repository;

  constructor(repository = new OlxAdCategoryRepository()) {
    this.repository = repository;
  }

  getAll() {
    return this.repository.getAll();
  }
}
