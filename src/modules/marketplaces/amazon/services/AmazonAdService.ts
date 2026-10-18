import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { SelectableService } from "@/shared/crud/services/SelectableService";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { LogService } from "@/modules/monitoring/services/LogService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { ConversionErrorManager } from "@/modules/anomalies/conversion-error/ConversionErrorManager";
import { PricingErrorManager } from "@/modules/anomalies/pricing-error/PricingErrorManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { AmazonPricingErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorReporter";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";

export class AmazonAdService {
  private repository;
  private priceService;
  private logService;
  private anomalyManager;
  private priceMapper;
  private static isGetting = false;
  selectable;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdRepository(),
    priceService = new AmazonAdPriceService(),
    logService = new LogService(),
    anomalyManager = new AnomalyManager<AmazonAdSelectDto>([
      new ConversionErrorManager(new AmazonConversionErrorReporter()),
      new PricingErrorManager(new AmazonPricingErrorReporter()),
    ]),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper()),
    updatable = new UpdatableService(repository, new AmazonAdUpdateMapper()),
    priceMapper = new AmazonAdListingPriceMapper()
  ) {
    this.repository = repository;
    this.priceService = priceService;
    this.logService = logService;
    this.anomalyManager = anomalyManager;
    this.selectable = selectable;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.priceMapper = priceMapper;
  }

  getAll() {
    return this.repository.getAll();
  }

  getCount(from?: Date, to?: Date) {
    return this.repository.getCount(from, to);
  }

  async updatePrices(id: number, prices: AmazonAdPriceCreateDto[]) {
    const promises = prices.map((price) =>
      this.priceService.creatable.create(price)
    );
    await Promise.allSettled(promises);

    await this.logService.creatable.create({ event: "ad_scraped" });
    const ad = await this.selectable.getById(id);

    this.priceService
      .getByAdAndCountry(
        ad.id,
        prices.map((price) => price.countryId)
      )
      .then((countryPrices) =>
        this.anomalyManager.check(ad, this.priceMapper.map(countryPrices))
      );
  }

  async getForScraping(count: number): Promise<{ id: number; asin: string }[]> {
    if (AmazonAdService.isGetting) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.getForScraping(count);
    }

    AmazonAdService.isGetting = true;
    try {
      return await this._getForScraping(count);
    } finally {
      AmazonAdService.isGetting = false;
    }
  }

  private async _getForScraping(count: number) {
    const ads = await this.repository.getForScraping(count);

    const ids = ads.map((ad) => ad.id);
    await this.repository.updateScrapedAt(ids);

    return ads;
  }
}
