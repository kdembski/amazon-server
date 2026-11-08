import _ from "lodash";
import { AmazonAdPriceCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceCreateMapper";
import { AmazonAdPriceUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdPriceUpdateMapper";
import { AmazonAdPriceRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdPriceRepository";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { isDatabaseUnavailable } from "@/shared/http/isDatabaseUnavailable";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class AmazonAdPriceService {
  private repository;
  private createMapper;
  private logger;
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
    ),
    logger = SystemLogService.getInstance()
  ) {
    this.repository = repository;
    this.createMapper = createMapper;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.logger = logger;
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

  // One INSERT; after a row error the valid prices are stored one by one. A database
  // that cannot be reached rejects, so the scraper sends the batch again.
  async store(prices: AmazonAdPriceCreateDto[]) {
    try {
      await this.createMany(prices);
    } catch (error) {
      if (isDatabaseUnavailable(error)) throw error;
      await this.createOneByOne(prices, error);
    }
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }

  // Stores the valid prices of an INSERT that failed as a whole, one ad after another
  private async createOneByOne(prices: AmazonAdPriceCreateDto[], batchError: unknown) {
    const failed: { price: AmazonAdPriceCreateDto; error: unknown }[] = [];
    for (const adPrices of Object.values(_.groupBy(prices, "adId"))) {
      const results = await Promise.allSettled(adPrices.map((price) => this.creatable.create(price)));
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failed.push({ price: adPrices[index], error: result.reason });
        }
      });
    }

    const message = `Batch insert of ${prices.length} prices failed, ${failed.length} of them were not stored one by one`;
    const context = {
      error: batchError,
      prices: prices.length,
      failed: failed.length,
      failedAdIds: _.uniq(failed.map(({ price }) => price.adId)),
      failedError: failed[0]?.error,
    };
    if (failed.length) this.logger.error("AmazonAdPriceService", message, context);
    else this.logger.warn("AmazonAdPriceService", message, context);
  }
}
