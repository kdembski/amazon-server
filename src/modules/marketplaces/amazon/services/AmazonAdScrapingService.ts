import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { Mutex } from "@/shared/utils/Mutex";

// Shared by all instances: two requests must not hand out the same ads
const scrapingMutex = new Mutex();

export class AmazonAdScrapingService {
  private repository;
  private missingService;
  private mutex;

  constructor(
    repository = new AmazonAdRepository(),
    missingService = new AmazonAdMissingService(),
    mutex = scrapingMutex
  ) {
    this.repository = repository;
    this.missingService = missingService;
    this.mutex = mutex;
  }

  getForScraping(batchSize: number): Promise<{ id: number; asin: string; skipCountryIds: number[] }[]> {
    return this.mutex.run(async () => {
      const ads = await this.repository.getForScraping(batchSize);
      const ids = ads.map((ad) => ad.id);
      await this.repository.updateScrapedAt(ids);
      const missing = await this.missingService.getCountryIdsByAd(ids);

      return ads.map((ad) => ({ ...ad, skipCountryIds: missing[ad.id] ?? [] }));
    });
  }
}
