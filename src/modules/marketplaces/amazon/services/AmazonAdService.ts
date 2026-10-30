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
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";

const ANOMALY_CHECK_CONCURRENCY = 10;
const ANOMALY_CHECK_LAG_MS = 60_000;
const LAG_WARNING_INTERVAL_MS = 60_000;
const SLOW_BATCH_MS = 10_000;
// Prisma codes of an unreachable or busy database, not of an invalid row
const CONNECTION_ERROR_CODES = ["P1001", "P1002", "P1008", "P1017", "P2024"];

export class AmazonAdService {
  private repository;
  private priceService;
  private activityCountService;
  private anomalyManager;
  private priceMapper;
  private logger;
  private categoryRepository;
  private idempotencyCache;
  private anomalyCheckQueue;
  private lastLagWarningAt = 0;
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
    logger = SystemLogService.getInstance(),
    categoryRepository = new AmazonAdCategoryRepository(),
    idempotencyCache = IdempotencyCache.getInstance(),
    anomalyCheckQueue = new ConcurrencyQueue(ANOMALY_CHECK_CONCURRENCY)
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
    this.categoryRepository = categoryRepository;
    this.idempotencyCache = idempotencyCache;
    this.anomalyCheckQueue = anomalyCheckQueue;
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
    const now = new Date(Date.now());

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
    return { count };
  }

  async updatePrices(id: number, prices: AmazonAdPriceCreateDto[]) {
    const ad = await this.selectable.getById(id);
    await this.storePrices(prices);
    this.countScraped(prices);
    this.queueAnomalyCheck(ad, prices);
  }

  async applyBatch({ prices, deleted }: AmazonAdBatchDto, key?: string) {
    const startedAt = Date.now();
    if (prices.length) {
      const store = () => this.storeBatchPrices(prices);
      await (key ? this.idempotencyCache.run(key, store) : store());
    }

    const deletedCount = deleted.length ? await this.repository.deleteMany(deleted) : 0;
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

    await this.storePrices(found.flatMap((item) => item.prices));
    found.forEach((item) => {
      this.countScraped(item.prices);
      this.queueAnomalyCheck(ads[item.id], item.prices);
    });
  }

  // One INSERT; after a row error the valid prices are stored one by one. A database
  // that cannot be reached rejects, so the scraper sends the batch again.
  private async storePrices(prices: AmazonAdPriceCreateDto[]) {
    try {
      await this.priceService.createMany(prices);
    } catch (error: any) {
      if (CONNECTION_ERROR_CODES.includes(error?.code ?? error?.errorCode)) throw error;
      await this.createPricesOneByOne(prices, error);
    }
  }

  private queueAnomalyCheck(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    this.anomalyCheckQueue.add((waitedMs) => {
      this.warnIfLagging(waitedMs);
      return this.checkAnomalies(ad, prices);
    });
  }

  private warnIfLagging(waitedMs: number) {
    const now = Date.now();
    if (waitedMs < ANOMALY_CHECK_LAG_MS) return;
    if (now - this.lastLagWarningAt < LAG_WARNING_INTERVAL_MS) return;

    this.lastLagWarningAt = now;
    this.logger.warn(
      "AmazonAdService",
      `Anomaly checks run ${Math.round(waitedMs / 1000)} s after the prices were stored`,
      { waitedMs, queuedAnomalyChecks: this.anomalyCheckQueue.size }
    );
  }

  private countScraped(prices: AmazonAdPriceCreateDto[]) {
    const scrapedCountryIds = prices.map((price) => price.countryId);
    this.activityCountService.increment("ad_scraped", "amazon", scrapedCountryIds);
  }

  private checkAnomalies(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const scrapedCountryIds = prices.map((price) => price.countryId);
    return this.priceService
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

  // Stores the valid prices of an INSERT that failed as a whole, one ad after another
  private async createPricesOneByOne(prices: AmazonAdPriceCreateDto[], batchError: unknown) {
    const failed: { price: AmazonAdPriceCreateDto; error: unknown }[] = [];
    for (const adPrices of Object.values(_.groupBy(prices, "adId"))) {
      const results = await Promise.allSettled(
        adPrices.map((price) => this.priceService.creatable.create(price))
      );
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
    if (failed.length) this.logger.error("AmazonAdService", message, context);
    else this.logger.warn("AmazonAdService", message, context);
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
