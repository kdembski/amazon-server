import { AmazonAdCreateMapper } from "@/mappers/amazon/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/mappers/amazon/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { LogService } from "@/services/LogService";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPricingErrorManager } from "@/managers/AmazonAdPricingErrorManager";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";
import { UpdatableService } from "@/services/crud/UpdatableService";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";

export class AmazonAdService {
  private repository;
  private priceService;
  private categoryService;
  private logService;
  private amazonAdConversionErrorManager;
  private amazonAdPricingErrorManager;
  private static isGetting = false;
  selectable;
  deletable;
  creatable;
  updatable;

  constructor(
    repository = new AmazonAdRepository(),
    priceService = new AmazonAdPriceService(),
    categoryService = new AmazonAdCategoryService(),
    logService = new LogService(),
    amazonAdConversionErrorManager = new AmazonAdConversionErrorManager(),
    amazonAdPricingErrorManager = new AmazonAdPricingErrorManager(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper()),
    updatable = new UpdatableService(repository, new AmazonAdUpdateMapper())
  ) {
    this.repository = repository;
    this.priceService = priceService;
    this.categoryService = categoryService;
    this.logService = logService;
    this.amazonAdConversionErrorManager = amazonAdConversionErrorManager;
    this.amazonAdPricingErrorManager = amazonAdPricingErrorManager;
    this.selectable = selectable;
    this.deletable = deletable;
    this.creatable = creatable;
    this.updatable = updatable;
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

    this.amazonAdConversionErrorManager.check(ad, [...prices]);
    this.amazonAdPricingErrorManager.check(ad, [...prices]);
  }

  async getForScraping(count: number) {
    return new Promise<{ id: number; asin: string }[]>((resolve) => {
      if (AmazonAdService.isGetting) {
        setTimeout(() => this._getForScraping(count, resolve), 1000);
        return;
      }

      AmazonAdService.isGetting = true;
      this._getForScraping(count, resolve);
    });
  }

  private async _getForScraping(
    count: number,
    resolve: (v: { id: number; asin: string }[]) => void
  ) {
    const categories = await this.categoryService.getActive();
    const categoryIds = categories.map((category) => category.id);

    const ads = await this.repository.getForScraping(count, categoryIds, []);
    const ids = ads.map((ad) => ad.id);
    await this.repository.updateScrapedAt(ids);

    AmazonAdService.isGetting = false;
    resolve(ads);
  }
}
