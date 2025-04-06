import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";
import { AiChatService } from "@/services/AiChatService";
import { AllegroScraper } from "@/scrapers/AllegroScraper";

export class DiscordConversionErrorService {
  private service;
  private aiChatService;
  private allegroScraper;

  constructor(
    service = new DiscordService(),
    aiChatService = AiChatService.getInstance(),
    allegroScraper = new AllegroScraper()
  ) {
    this.service = service;
    this.aiChatService = aiChatService;
    this.allegroScraper = allegroScraper;
  }

  async send(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    const embed = {
      title: ad.name,
      description: ad.asin,
      image: {
        url: ad.image,
        height: 200,
      },
      fields: [
        ...prices.map((price) => {
          return {
            name: price.country.name,
            value: `[${price.value.toFixed(2)} PLN](https://www.amazon.${
              price.country.code
            }/dp/${ad.asin})`,
          };
        }),
      ],
    };

    this.service.send({ embeds: [embed] });
  }

  setChannel(channel: string) {
    this.service.client = `DISCORD_CONVERSION_ERROR_${channel}_TOKEN`;
  }
}
