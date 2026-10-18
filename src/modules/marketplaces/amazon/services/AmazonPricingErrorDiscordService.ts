import { format } from "date-fns";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { DiscordService } from "@/shared/discord/DiscordService";
import { roundToTwoDecimals } from "@/shared/utils/number";

export class AmazonPricingErrorDiscordService {
  private service;

  constructor(service = new DiscordService("DISCORD_PRICING_ERROR_TOKEN")) {
    this.service = service;
  }

  async send(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    const fields = countryPrices.map((prices) => {
      const { name, code, currencyCode } = prices[0].country;

      return {
        name,
        value: prices
          .map((price, i) => {
            const link = this.getUrl(ad, code);
            const date = format(price.createdAt, "d MMM HH:mm");
            const value = price.value.toNumber();
            const difference = this.getDifference(value, prices, i);

            const withCurrency = this.getValueWithCurrency(value, currencyCode);
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
      footer: { text: ad.category.name },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : undefined,
    };

    this.service.send({ embeds: [embed] });
  }

  getDifference(value: number, prices: ListingPrice[], i: number) {
    const nextValue = prices[i + 1]?.value.toNumber();
    if (!nextValue) return;

    return Math.round(((value - nextValue) * 100) / nextValue);
  }

  getValueWithCurrency(value: number, currencyCode: string) {
    return `**${roundToTwoDecimals(value)} ${currencyCode}**`;
  }

  getFullText(withCurrency: string, difference?: number) {
    return difference
      ? `${withCurrency} *(${difference}%)*`
      : `${withCurrency}`;
  }

  private getUrl(ad: AmazonAdSelectDto, countryCode: string) {
    return `https://www.amazon.${countryCode}/dp/${ad.asin}`;
  }
}
