import {
  EmbedBuilder,
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";
import { Prisma } from "@prisma/client";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";

export class DiscordService {
  private client: WebhookClient;

  constructor(
    client: WebhookClient = new WebhookClient({
      url: "https://discord.com/api/webhooks/1330971040771346534/GcChJE3HhAXp_QWqXYB9kQOmflBSli9rDZVHS0zOFq3IeAgLKrjWqSF4uCigLA7l9Buj",
    })
  ) {
    this.client = client;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    try {
      this.client.send(options);
    } catch (e) {
      console.error(e);
    }
  }

  sendAd(
    ad: {
      id: number;
      name: string;
      asin: string;
      image: string;
    },
    prices: AmazonAdPriceCreateDto[]
  ) {
    const embed = {
      title: ad.name,
      description: ad.asin,
      image: {
        url: ad.image,
      },
      fields: [
        ...prices.map((price) => {
          return {
            name: price.country.name,
            value: `[${price.value} PLN](https://www.amazon.${price.country.code}/dp/${ad.asin})`,
          };
        }),
      ],
    };

    this.send({ embeds: [embed] });
  }
}
