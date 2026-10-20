import { AmazonAdPriceCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceUpdateMapper";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";

export class AmazonAdPriceService {
  private repository;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdPriceRepository(),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(
      repository,
      new AmazonAdPriceCreateMapper()
    ),
    updatable = new UpdatableService(
      repository,
      new AmazonAdPriceUpdateMapper()
    )
  ) {
    this.repository = repository;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getRecentByAd(adId: number, since: Date) {
    return this.repository.getRecentByAd(adId, since);
  }
}
