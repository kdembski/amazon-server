import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";

export class ScraperConfigService {
  private repository;

  constructor(repository = new ScraperConfigRepository()) {
    this.repository = repository;
  }

  get(scraper: string) {
    return this.repository.getOrCreate(scraper);
  }
}
