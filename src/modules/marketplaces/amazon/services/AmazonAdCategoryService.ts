import { AmazonAdCategorySelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdCategoryDtos";
import { AmazonAdCategoryCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCategoryUpdateMapper";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { Mutex } from "@/shared/utils/Mutex";

// Shared by all instances: two requests must not hand out the same category
const scrapingMutex = new Mutex();

export class AmazonAdCategoryService {
  private repository;
  deletable;
  creatable;
  updatable;
  private scrapingMutex;

  constructor(
    repository = new AmazonAdCategoryRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new AmazonAdCategoryCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new AmazonAdCategoryUpdateMapper()
    ),
    mutex = scrapingMutex
  ) {
    this.scrapingMutex = mutex;
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  getForScraping(): Promise<AmazonAdCategorySelectDto> {
    return this.scrapingMutex.run(async () => {
      const category = await this.repository.getForScraping();
      await this.repository.update(category.id, { scrapedAt: new Date() });
      return category;
    });
  }
}
