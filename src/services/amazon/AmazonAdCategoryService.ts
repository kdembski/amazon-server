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

  getByName(name: string) {
    return this.repository.getByName(name);
  }

  getActive() {
    return this.repository.getActive();
  }

  updateActive(id: number, active: boolean) {
    return this.repository.updateActive(id, active);
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
