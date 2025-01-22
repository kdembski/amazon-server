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

export class AmazonAdService {
  private repository;
  private updateMapper;
  private priceService;
  private currencyExchangeRateService;
  private discordService;
  selectable;
  deletable;
  creatable;

  constructor(
    repository = new AmazonAdRepository(),
    updateMapper = new AmazonAdUpdateMapper(),
    priceService = new AmazonAdPriceService(),
    currencyExchangeRateService = new CurrencyExchangeRateService(),
    discordService = new DiscordService(),
    selectable = new SelectableService(repository),
    deletable = new DeletableService(repository),
    creatable = new CreatableService(repository, new AmazonAdCreateMapper())
  ) {
    this.repository = repository;
    this.updateMapper = updateMapper;
    this.priceService = priceService;
    this.currencyExchangeRateService = currencyExchangeRateService;
    this.discordService = discordService;
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
      this.priceService.updateOrCreate(price)
    );
    await Promise.all(promises);

    this.sendDiscordMessage(id, [...prices]);

    return this.repository.update(id, input);
  }

  async getForScraping() {
    const ads = await this.repository.getForScraping();

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

      price.value = Math.round(price.value * rate.value.toNumber() * 100) / 100;
    });

    prices = prices.filter((price) => !!price.value);
    prices.sort((a, b) => a.value - b.value);

    const shouldSend = prices[0].value <= prices[1].value * 0.6;

    if (shouldSend) {
      this.discordService.sendAd(ad, prices);
    }
  }
}
