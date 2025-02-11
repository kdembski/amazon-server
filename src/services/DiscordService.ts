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
import { CountrySelectDto } from "@/dtos/currency/CountryDtos";

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
    prices: AmazonAdPriceSelectDto[],
    country: CountrySelectDto
  ) {
    const fields = prices
      .slice(0, 5)
      .map((price, i) => {
        const link = `https://www.amazon.${country.code}/dp/${ad.asin}`;
        const name = format(price.createdAt, "d MMM HH:mm");
        const previousValue = prices[i + 1]?.value.toNumber();
        const value = price.value.toNumber();
        const difference = Math.round(
          ((value - previousValue) * 100) / previousValue
        );

        const text = difference
          ? `${value.toFixed(2)} ${price.currency.code} *(${difference}%)*`
          : `${value.toFixed(2)} ${price.currency.code}`;

        if (i === 0) {
          return {
            name: "Teraz",
            value: `[${text}](${link})`,
          };
        }

        return { name, value: text };
      })
      .reverse();

    const embed = {
      title: ad.name,
      description: country.name,
      image: {
        url: ad.image,
        height: 200,
      },
      fields,
    };

    this.send({ embeds: [embed] });
  }
}
