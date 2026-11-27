import { AmazonAdEmbedBuilder } from "@/modules/marketplaces/amazon/services/AmazonAdEmbedBuilder";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";
import { format } from "date-fns";
import { ListingPrice } from "@/modules/anomalies/types/listing-price";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";

export class AmazonPriceDropDiscordService {
  private service;
  private embedBuilder;

  constructor(service = new DiscordChannelService(), embedBuilder = new AmazonAdEmbedBuilder()) {
    this.service = service;
    this.embedBuilder = embedBuilder;
  }

  async send(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][], channelId: number) {
    const embed = this.buildEmbed(ad, countryPrices);
    await this.service.send(channelId, { embeds: [embed] }, { asin: ad.asin });
  }

  buildEmbed(ad: AmazonAdSelectDto, countryPrices: ListingPrice[][]) {
    const fields = countryPrices.map((countryHistory) => {
      const prices = this.getPriceChanges(countryHistory);
      const { name, currencyCode } = prices[0].country;

      return {
        name,
        value: prices
          .map((price, i) => {
            const date = format(price.createdAt, "d MMM HH:mm");
            const value = price.value.toNumber();
            const difference = this.getDifference(value, prices, i);

            const withCurrency = this.getValueWithCurrency(value, currencyCode);
            const text = this.getFullText(withCurrency, difference);

            if (i === 0) return `${date} – [${text}](${price.url})`;
            return `${date} – ${text}`;
          })
          .reverse()
          .join("\n"),
      };
    });

    return this.embedBuilder.build(ad, fields);
  }

  // Prices are newest first: keeps the newest one and the oldest price of every run of equal prices.
  getPriceChanges(prices: ListingPrice[]) {
    return prices.filter(
      (price, i) => i === 0 || !prices[i + 1]?.value.equals(price.value)
    );
  }

  getDifference(value: number, prices: ListingPrice[], i: number) {
    const nextValue = prices[i + 1]?.value.toNumber();
    if (!nextValue) return;

    return Math.round(((value - nextValue) * 100) / nextValue);
  }

  getValueWithCurrency(value: number, currencyCode: string) {
    return `**${NumberFormatter.round(value, 2)} ${currencyCode}**`;
  }

  getFullText(withCurrency: string, difference?: number) {
    return difference
      ? `${withCurrency} *(${difference}%)*`
      : `${withCurrency}`;
  }
}
