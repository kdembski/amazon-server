import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { SelectableService } from "@/shared/crud/services/SelectableService";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { ConversionErrorManager } from "@/modules/anomalies/conversion-error/ConversionErrorManager";
import { PricingErrorManager } from "@/modules/anomalies/pricing-error/PricingErrorManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonConversionErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonConversionErrorReporter";
import { AmazonPricingErrorReporter } from "@/modules/marketplaces/amazon/services/AmazonPricingErrorReporter";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class AmazonAdService {
  private repository;
  private priceService;
  private activityEventService;
  private anomalyManager;
  private priceMapper;
  private logger;
  private static isGetting = false;
  selectable;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdRepository(),
    priceService = new AmazonAdPriceService(),
    activityEventService = new ActivityEventService(),
    anomalyManager = new AnomalyManager<AmazonAdSelectDto>([
      new ConversionErrorManager(new AmazonConversionErrorReporter()),
      new PricingErrorManager(new AmazonPricingErrorReporter()),
    ]),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper()),
    updatable = new UpdatableService(repository, new AmazonAdUpdateMapper()),
    priceMapper = new AmazonAdListingPriceMapper(),
    logger = SystemLogService.getInstance()
  ) {
    this.logger = logger;
    this.repository = repository;
    this.priceService = priceService;
    this.activityEventService = activityEventService;
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
    const results = await Promise.allSettled(promises);
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        this.logger.error("AmazonAdService", `Price of ad ${id} was not stored`, {
          error: result.reason,
          adId: id,
          price: prices[index],
        });
      }
    });

    const ad = await this.selectable.getById(id);
    await this.activityEventService.creatable.create({
      type: "ad_scraped",
      marketplace: "amazon",
      data: { asin: ad.asin },
    });

    const scrapedCountryIds = prices.map((price) => price.countryId);
    this.priceService
      .getRecentByAd(ad.id)
      .then((countryPrices) =>
        this.anomalyManager.check(
          ad,
          this.priceMapper.map(ad.asin, countryPrices, scrapedCountryIds)
        )
      )
      .catch((error) =>
        this.logger.error("AmazonAdService", `Anomaly check of ad ${ad.id} failed`, {
          error,
          adId: ad.id,
          asin: ad.asin,
          scrapedCountryIds,
        })
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
