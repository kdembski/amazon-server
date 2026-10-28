import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { SelectableService } from "@/shared/crud/services/SelectableService";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { AmazonPriceDropReporter } from "@/modules/marketplaces/amazon/services/AmazonPriceDropReporter";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class AmazonAdService {
  private repository;
  private priceService;
  private activityCountService;
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
    activityCountService = new ActivityCountService(),
    anomalyManager = new AnomalyManager<AmazonAdSelectDto>([
      new CountryOutlierManager(new AmazonCountryOutlierReporter()),
      new PriceDropManager(new AmazonPriceDropReporter()),
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
    this.activityCountService = activityCountService;
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
    const ad = await this.selectable.getById(id);
    await this.priceService
      .createMany(prices)
      .catch(() => this.createPricesOneByOne(id, prices));
    const scrapedCountryIds = prices.map((price) => price.countryId);
    this.activityCountService.increment("ad_scraped", "amazon", scrapedCountryIds);
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

  // Stores the valid prices of a batch that failed as a whole
  private async createPricesOneByOne(id: number, prices: AmazonAdPriceCreateDto[]) {
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
  }

  async getForScraping(batchSize: number): Promise<{ id: number; asin: string }[]> {
    if (AmazonAdService.isGetting) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.getForScraping(batchSize);
    }

    AmazonAdService.isGetting = true;
    try {
      return await this._getForScraping(batchSize);
    } finally {
      AmazonAdService.isGetting = false;
    }
  }

  private async _getForScraping(batchSize: number) {
    const ads = await this.repository.getForScraping(batchSize);

    const ids = ads.map((ad) => ad.id);
    await this.repository.updateScrapedAt(ids);

    return ads;
  }
}
