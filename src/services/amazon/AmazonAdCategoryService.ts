import { AmazonAdCategorySelectDto } from "@/dtos/amazon/AmazonAdCategoryDtos";
import { AmazonAdCategoryCreateMapper } from "@/mappers/amazon/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/mappers/amazon/AmazonAdCategoryUpdateMapper";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

export class AmazonAdCategoryService {
  private repository;
  deletable;
  creatable;
  updatable;
  private static isGetting = false;

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
    )
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  async getForScraping() {
    return new Promise<AmazonAdCategorySelectDto>((resolve) => {
      if (AmazonAdCategoryService.isGetting) {
        setTimeout(() => this._getForScraping(resolve), 1000);
        return;
      }

      AmazonAdCategoryService.isGetting = true;
      this._getForScraping(resolve);
    });
  }

  async _getForScraping(resolve: (v: AmazonAdCategorySelectDto) => void) {
    const category = await this.repository.getForScraping();

    await this.repository.update(category.id, {
      scrapedAt: new Date(Date.now()),
    });

    AmazonAdCategoryService.isGetting = false;
    resolve(category);
  }
}
