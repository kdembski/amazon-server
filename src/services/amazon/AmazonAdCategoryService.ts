import { AmazonAdCategorySelectDto } from "@/dtos/amazon/AmazonAdCategoryDtos";
import { AmazonAdCategoryCreateMapper } from "@/mappers/amazon/AmazonAdCategoryCreateMapper";
import { AmazonAdCategoryUpdateMapper } from "@/mappers/amazon/AmazonAdCategoryUpdateMapper";
import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

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

  async getForScraping(): Promise<AmazonAdCategorySelectDto> {
    if (AmazonAdCategoryService.isGetting) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.getForScraping();
    }

    AmazonAdCategoryService.isGetting = true;
    try {
      return await this._getForScraping();
    } finally {
      AmazonAdCategoryService.isGetting = false;
    }
  }

  private async _getForScraping() {
    const category = await this.repository.getForScraping();

    await this.repository.update(category.id, {
      scrapedAt: new Date(Date.now()),
    });

    return category;
  }
}
