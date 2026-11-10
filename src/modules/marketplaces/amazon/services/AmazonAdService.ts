import _ from "lodash";
import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { CreatableService } from "@/shared/crud/services/CreatableService";
import { DeletableService } from "@/shared/crud/services/DeletableService";
import { SelectableService } from "@/shared/crud/services/SelectableService";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { AnomalyCheckQueue } from "@/modules/anomalies/AnomalyCheckQueue";
import { AnomalyManager } from "@/modules/anomalies/AnomalyManager";
import { CountryOutlierManager } from "@/modules/anomalies/country-outlier/CountryOutlierManager";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { AmazonAdListingPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdListingPriceMapper";
import { AmazonCountryOutlierReporter } from "@/modules/marketplaces/amazon/services/AmazonCountryOutlierReporter";
import { AmazonPriceDropReporter } from "@/modules/marketplaces/amazon/services/AmazonPriceDropReporter";
import {
  AmazonAdBatchDto,
  AmazonAdCreateDto,
  AmazonAdSelectDto,
} from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { UpdatableService } from "@/shared/crud/services/UpdatableService";
import { AmazonAdPriceCreateDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";

const SLOW_BATCH_MS = 10_000;

export class AmazonAdService {
  private repository;
  private priceService;
  private activityCountService;
  private priceMapper;
  private logger;
  private categoryRepository;
  private idempotencyCache;
  private anomalyCheckQueue;
  private missingService;
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
    logger = SystemLogService.getInstance(),
    categoryRepository = new AmazonAdCategoryRepository(),
    idempotencyCache = IdempotencyCache.getInstance(),
    anomalyCheckQueue = new AnomalyCheckQueue(anomalyManager),
    missingService = new AmazonAdMissingService()
  ) {
    this.logger = logger;
    this.repository = repository;
    this.priceService = priceService;
    this.activityCountService = activityCountService;
    this.selectable = selectable;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.priceMapper = priceMapper;
    this.categoryRepository = categoryRepository;
    this.idempotencyCache = idempotencyCache;
    this.anomalyCheckQueue = anomalyCheckQueue;
    this.missingService = missingService;
  }

  getAll() {
    return this.repository.getAll();
  }

  getCount(from?: Date, to?: Date) {
    return this.repository.getCount(from, to);
  }

  async createMany(dtos: AmazonAdCreateDto[]) {
    const names = _.uniq(dtos.map((dto) => dto.categoryName));
    const categories = await Promise.all(
      names.map((name) => this.categoryRepository.upsertByName(name))
    );
    const categoryIds = _.zipObject(names, categories.map((category) => category.id));
    const now = new Date();

    const count = await this.repository.createMany(
      dtos.map((dto) => ({
        asin: dto.asin,
        name: dto.name,
        image: dto.image,
        excluded: null,
        categoryId: categoryIds[dto.categoryName],
        createdAt: now,
        updatedAt: now,
      }))
    );
    this.activityCountService.incrementBy("ad_created", "amazon", count);
    return { count };
  }

  async updatePrices(id: number, prices: AmazonAdPriceCreateDto[]) {
    const ad = await this.selectable.getById(id);
    await this.priceService.store(prices);
    this.countScraped(prices);
    this.queueAnomalyCheck(ad, prices);
  }

  async applyBatch({ prices, deleted }: AmazonAdBatchDto, key?: string) {
    const startedAt = Date.now();
    if (prices.length) {
      await this.idempotencyCache.run(key, () => this.storeBatchPrices(prices));
    }

    const deletedCount = deleted.length ? await this.repository.deleteMany(deleted) : 0;
    this.activityCountService.incrementBy("ad_deleted", "amazon", deletedCount);
    const durationMs = Date.now() - startedAt;
    if (durationMs > SLOW_BATCH_MS) {
      this.logger.warn("AmazonAdService", `Batch of ${prices.length} ads took ${durationMs} ms`, {
        ads: prices.length,
        prices: _.sumBy(prices, (item) => item.prices.length),
        deleted: deleted.length,
        durationMs,
        key,
        queuedAnomalyChecks: this.anomalyCheckQueue.size,
      });
    }
    return { prices: prices.length, deleted: deletedCount };
  }

  private async storeBatchPrices(batch: AmazonAdBatchDto["prices"]) {
    const ads = _.keyBy(await this.repository.getByIds(batch.map((item) => item.id)), "id");
    const [found, missing] = _.partition(batch, (item) => ads[item.id]);
    if (missing.length) {
      this.logger.warn(
        "AmazonAdService",
        `Skipped the prices of ${missing.length} ads missing in the database`,
        { adIds: missing.map((item) => item.id) }
      );
    }

    await this.priceService.store(found.flatMap((item) => item.prices));
    await this.storeMissing(found);
    found.forEach((item) => {
      this.countScraped(item.prices);
      this.queueAnomalyCheck(ads[item.id], item.prices);
    });
  }

  private async storeMissing(batch: AmazonAdBatchDto["prices"]) {
    const ads = batch.map((item) => ({ id: item.id, routeIds: item.missingRouteIds ?? [] }));
    await this.missingService.store(ads).catch((error) => {
      this.logger.error("AmazonAdService", "Storing the missing routes of ads failed", {
        error,
        adIds: ads.filter((ad) => ad.routeIds.length).map((ad) => ad.id),
      });
    });
  }

  private countScraped(prices: AmazonAdPriceCreateDto[]) {
    const scrapedCountryIds = prices.map((price) => price.countryId);
    this.activityCountService.increment("ad_scraped", "amazon", scrapedCountryIds);
  }

  private queueAnomalyCheck(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const scrapedCountryIds = prices.map((price) => price.countryId);
    const getPrices = async () => {
      return this.priceMapper.map(ad.asin, await this.priceService.getRecentByAd(ad.id), scrapedCountryIds);
    };
    this.anomalyCheckQueue.add(ad, getPrices, { adId: ad.id, asin: ad.asin, scrapedCountryIds });
  }
}
