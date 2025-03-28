import { styleText } from "node:util";
import {
  AmazonAdSelectDto,
  AmazonAdUpdateDto,
} from "@/dtos/amazon/AmazonAdDtos";
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

export class AmazonAdService {
  private repository;
  private updateMapper;
  private priceService;
  private logService;
  private amazonAdConversionErrorManager;
  private amazonAdPricingErrorManager;
  private static isGetting = false;
  selectable;
  deletable;
  creatable;

  constructor(
    repository = new AmazonAdRepository(),
    updateMapper = new AmazonAdUpdateMapper(),
    priceService = new AmazonAdPriceService(),
    logService = new LogService(),
    amazonAdConversionErrorManager = new AmazonAdConversionErrorManager(),
    amazonAdPricingErrorManager = new AmazonAdPricingErrorManager(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper())
  ) {
    this.repository = repository;
    this.updateMapper = updateMapper;
    this.priceService = priceService;
    this.logService = logService;
    this.amazonAdConversionErrorManager = amazonAdConversionErrorManager;
    this.amazonAdPricingErrorManager = amazonAdPricingErrorManager;
    this.selectable = selectable;
    this.deletable = deletable;
    this.creatable = creatable;
  }

  getAll() {
    return this.repository.getAll();
  }

  async update(id: number, dto: AmazonAdUpdateDto) {
    const input = this.updateMapper.toUpdateInput(dto);
    const prices = dto.prices;

    const promises = prices.map((price) =>
      this.priceService.creatable.create(price)
    );
    await Promise.allSettled(promises);

    await this.logService.creatable.create({ event: "ad_scraped" });
    const ad = await this.selectable.getById(id);
    console.log(
      `${styleText("dim", "Scraped")} ${ad.asin} ${styleText(
        "dim",
        "from"
      )} ${prices.map((p) => p.country.code).join(", ")} (${prices.length})`
    );

    this.amazonAdConversionErrorManager.check(ad, [...prices]);
    this.amazonAdPricingErrorManager.check(ad, [...prices]);

    return this.repository.update(id, input);
  }

  async getForScraping(count: number) {
    return new Promise<AmazonAdSelectDto[]>((resolve) => {
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
    resolve: (v: AmazonAdSelectDto[]) => void
  ) {
    const ads = await this.repository.getForScraping(count);

    const promises = ads.map((ad) =>
      this.repository.update(ad.id, { scrapedAt: new Date(Date.now()) })
    );

    await Promise.all(promises);
    AmazonAdService.isGetting = false;
    resolve(ads);
  }
}
