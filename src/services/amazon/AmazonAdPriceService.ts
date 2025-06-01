import { AmazonAdPriceCreateMapper } from "@/mappers/amazon/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/mappers/amazon/AmazonAdPriceUpdateMapper";
import { AmazonAdPriceRepository } from "@/repositories/amazon/AmazonAdPriceRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { UpdatableService } from "@/services/crud/UpdatableService";

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

  getByAdAndCountry(adId: number, countryIds: number[]) {
    return this.repository.getByAdAndCountry(adId, countryIds);
  }
}
