import { AmazonAdPriceCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceUpdateMapper";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonAdPriceService {
  private repository;
  private createMapper;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdPriceRepository(),
    createMapper = new AmazonAdPriceCreateMapper(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, createMapper),
    updatable = new UpdatableService(
      repository,
      new AmazonAdPriceUpdateMapper()
    )
  ) {
    this.repository = repository;
    this.createMapper = createMapper;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getRecentByAd(adId: number) {
    return this.repository.getRecentByAd(adId);
  }

  // One INSERT for all prices; fails as a whole when any row is invalid
  createMany(dtos: AmazonAdPriceCreateDto[]) {
    return this.repository.createMany(
      dtos.map((dto) => this.createMapper.toCreateManyInput(dto))
    );
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }
}
