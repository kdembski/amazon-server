import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { LogThrottle } from "@/shared/logging/services/LogThrottle";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { Mutex } from "@/shared/utils/Mutex";

// Shared by all instances: two requests must not hand out the same ads
const scrapingMutex = new Mutex();
const emptyBatchThrottle = new LogThrottle(10 * 60_000);

export class AmazonAdScrapingService {
  private repository;
  private missingService;
  private mutex;
  private emptyBatchThrottle;
  private logger;

  constructor(
    repository = new AmazonAdRepository(),
    missingService = new AmazonAdMissingService(),
    mutex = scrapingMutex,
    throttle = emptyBatchThrottle,
    logger = SystemLogService.getInstance()
  ) {
    this.repository = repository;
    this.missingService = missingService;
    this.mutex = mutex;
    this.emptyBatchThrottle = throttle;
    this.logger = logger;
  }

  getForScraping(batchSize: number): Promise<{ id: number; asin: string; skipRouteIds: number[] }[]> {
    return this.mutex.run(async () => {
      const ads = await this.repository.getForScraping(batchSize);
      if (batchSize > 0 && !ads.length) this.warnEmptyBatch(batchSize);
      const ids = ads.map((ad) => ad.id);
      await this.repository.updateScrapedAt(ids);
      const missing = await this.missingService.getRouteIdsByAd(ids);

      return ads.map((ad) => ({ ...ad, skipRouteIds: missing[ad.id] ?? [] }));
    });
  }

  private warnEmptyBatch(batchSize: number) {
    if (!this.emptyBatchThrottle.shouldLog()) return;
    this.logger.warn("AmazonAdScrapingService", "No ads to scrape, the scrapers got an empty batch", { batchSize });
  }
}
