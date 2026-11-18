import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class ScraperConfigService {
  private repository;
  private logger;

  constructor(repository = new ScraperConfigRepository(), logger = SystemLogService.getInstance()) {
    this.repository = repository;
    this.logger = logger;
  }

  async get(scraper: string) {
    const config = await this.repository.get(scraper);
    if (config) return config;

    const created = await this.repository.getOrCreate(scraper);
    this.logger.info("ScraperConfigService", `Scraper ${scraper} registered with the default config`, {
      scraper,
      config: created,
    });
    return created;
  }
}
