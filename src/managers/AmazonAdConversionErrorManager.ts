import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { roundToTwoDecimals } from "@/helpers/number";
import { AllegroScraper } from "@/scrapers/AllegroScraper";
import { AiChatService } from "@/services/AiChatService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CurrencyService } from "@/services/currency/CurrencyService";
import { DiscordService } from "@/services/DiscordService";
import { LogService } from "@/services/LogService";

export class AmazonAdConversionErrorManager {
  private discordService;
  private logService;
  private currencyService;
  private currencyExchangeRateService;
  private aiChatService;

  constructor(
    discordService = new DiscordService(),
    logService = new LogService(),
    currencyService = new CurrencyService(),
    currencyExchangeRateService = new CurrencyExchangeRateService(),
    aiChatService = new AiChatService()
  ) {
    this.discordService = discordService;
    this.logService = logService;
    this.currencyService = currencyService;
    this.currencyExchangeRateService = currencyExchangeRateService;
    this.aiChatService = aiChatService;
  }

  async verify(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const pln = await this.currencyService.getByCode("PLN");
    if (!pln) return;

    const rates = await this.currencyExchangeRateService.getByTarget(pln.id);

    prices.forEach((price) => {
      const rate = rates.find(
        (rate) => rate.sourceId === price.country.currencyId
      );
      if (!rate) return;

      price.value = roundToTwoDecimals(price.value * rate.value.toNumber());
    });

    prices.sort((a, b) => a.value - b.value);

    if (this.shouldSend(prices)) {
      const productName = await this.aiChatService.getProductName(ad.name);
      //await this.allegroScraper.scrapPlp(productName);

      await this.logService.creatable.create({
        event: "ad_sent",
        data: JSON.stringify(prices),
      });
      this.discordService.sendConversionError(ad, prices);
    }
  }

  private shouldSend(prices: AmazonAdPriceCreateDto[]) {
    const polandCode = "pl";

    if (prices[0]?.country.code === polandCode) {
      return prices[0]?.value <= prices[1]?.value * 0.3;
    }

    return prices[0]?.value <= prices[1]?.value * 0.5;
  }
}
