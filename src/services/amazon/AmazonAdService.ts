import { AmazonAdUpdateDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdCreateMapper } from "@/mappers/amazon/AmazonAdCreateMapper";
import { AmazonAdUpdateMapper } from "@/mappers/amazon/AmazonAdUpdateMapper";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { CreatableService } from "@/services/crud/CreatableService";
import { DeletableService } from "@/services/crud/DeletableService";
import { SelectableService } from "@/services/crud/SelectableService";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { DiscordService } from "@/services/DiscordService";
import { LogService } from "@/services/LogService";
import { roundToTwoDecimals } from "@/helpers/number";

export class AmazonAdService {
  private repository;
  private updateMapper;
  private priceService;
  private discordService;
  private logService;
  private currencyExchangeRateService;
  selectable;
  deletable;
  creatable;

  constructor(
    repository = new AmazonAdRepository(),
    updateMapper = new AmazonAdUpdateMapper(),
    priceService = new AmazonAdPriceService(),
    discordService = new DiscordService(),
    logService = new LogService(),
    currencyExchangeRateService = new CurrencyExchangeRateService(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper())
  ) {
    this.repository = repository;
    this.updateMapper = updateMapper;
    this.priceService = priceService;
    this.discordService = discordService;
    this.logService = logService;
    this.currencyExchangeRateService = currencyExchangeRateService;
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

    this.sendDiscordMessage(id, [...prices]);

    return this.repository.update(id, input);
  }

  async getForScraping(count: number) {
    const ads = await this.repository.getForScraping(count);

    const promises = ads.map((ad) =>
      this.repository.update(ad.id, { scrapedAt: new Date(Date.now()) })
    );

    await Promise.all(promises);
    return ads;
  }

  async sendDiscordMessage(adId: number, prices: AmazonAdPriceCreateDto[]) {
    const plnId = 3;

    const rates = await this.currencyExchangeRateService.getByTarget(plnId);
    const ad = await this.selectable.getById(adId);

    prices.forEach((price) => {
      const rate = rates.find((rate) => rate.sourceId === price.currencyId);
      if (!rate) return;

      price.value = roundToTwoDecimals(price.value * rate.value.toNumber());
    });

    prices = prices.filter((price) => !!price.value);
    prices.sort((a, b) => a.value - b.value);

    if (this.shouldSend(prices)) {
      await this.logService.creatable.create({
        event: "ad_sent",
        data: JSON.stringify(prices),
      });
      this.discordService.sendAd(ad, prices);
    }
  }

  private shouldSend(prices: AmazonAdPriceCreateDto[]) {
    const polandCode = "pl";

    if (prices[0]?.country.code === polandCode) {
      return prices[0]?.value <= prices[1]?.value * 0.6;
    }

    return prices[0]?.value <= prices[1]?.value * 0.7;
  }
}
