import { format } from "date-fns";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";
import { CurrencySelectDto } from "@/dtos/currency/CurrencyDtos";
import { AllegroScraper } from "@/scrapers/AllegroScraper";
import { AiChatService } from "@/services/AiChatService";

export class DiscordPricingErrorService {
  private service;
  private aiChatService;
  private allegroScraper;

  constructor(
    service = new DiscordService("DISCORD_PRICING_ERROR_TOKEN"),
    aiChatService = AiChatService.getInstance(),
    allegroScraper = new AllegroScraper()
  ) {
    this.service = service;
    this.aiChatService = aiChatService;
    this.allegroScraper = allegroScraper;
  }

  async send(ad: AmazonAdSelectDto, marketplaces: AmazonAdPriceSelectDto[][]) {
    const fields = marketplaces.map((prices) => {
      const { name, code, currency } = prices[0].country;

      return {
        name,
        value: prices
          .map((price, i) => {
            const link = `https://www.amazon.${code}/dp/${ad.asin}`;
            const date = format(price.createdAt, "d MMM HH:mm");
            const value = price.value.toNumber();
            const difference = this.getDifference(value, prices, i);

            const withCurrency = this.getValueWithCurrency(value, currency);
            const text = this.getFullText(withCurrency, difference);

            if (i === 0) return `${date} – [${text}](${link})`;
            return `${date} – ${text}`;
          })
          .reverse()
          .join("\n"),
      };
    });

    const embed = {
      title: ad.name,
      description: ad.asin,
      image: {
        url: ad.image,
        height: 200,
      },
      fields,
    };

    this.service.send({ embeds: [embed] });
  }

  getDifference(value: number, prices: AmazonAdPriceSelectDto[], i: number) {
    const nextValue = prices[i + 1]?.value.toNumber();
    if (!nextValue) return;

    return Math.round(((value - nextValue) * 100) / nextValue);
  }

  getValueWithCurrency(value: number, currency: CurrencySelectDto) {
    return `**${value.toFixed(2)} ${currency.code}**`;
  }

  getFullText(withCurrency: string, difference?: number) {
    return difference
      ? `${withCurrency} *(${difference}%)*`
      : `${withCurrency}`;
  }
}
