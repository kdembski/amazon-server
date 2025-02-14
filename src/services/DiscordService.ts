import {
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";
import { format } from "date-fns";
import {
  AmazonAdPriceCreateDto,
  AmazonAdPriceSelectDto,
} from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";

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

  sendConversionError(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
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

    this.send({ embeds: [embed] });
  }

  sendPricingError(
    ad: AmazonAdSelectDto,
    marketplaces: AmazonAdPriceSelectDto[][]
  ) {
    const fields = marketplaces.map((marketplace) => {
      const { name, code, currency } = marketplace[0].country;

      return {
        name,
        value: marketplace
          .slice(0, 5)
          .map((price, i) => {
            const link = `https://www.amazon.${code}/dp/${ad.asin}`;
            const date = format(price.createdAt, "d MMM HH:mm");
            const nextValue = marketplace[i + 1]?.value.toNumber();
            const value = price.value.toNumber();
            const difference = Math.round(
              ((value - nextValue) * 100) / nextValue
            );

            const valueWithCurrency = `**${value.toFixed(2)} ${
              currency.code
            }**`;
            const text = difference
              ? `${valueWithCurrency} *(${difference}%)*`
              : `${valueWithCurrency}`;

            if (i === 0) return `${date} [${text}](${link})`;
            return `${date} ${text}`;
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

    this.send({ embeds: [embed] });
  }
}
