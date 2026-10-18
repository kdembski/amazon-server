import { format } from "date-fns";
import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { DiscordService } from "@/shared/discord/DiscordService";
import { roundToTwoDecimals } from "@/shared/utils/number";

export class DiscordPricingErrorService {
  private service;

  constructor(service = new DiscordService("DISCORD_PRICING_ERROR_TOKEN")) {
    this.service = service;
  }

  async send(listing: Listing, countryPrices: ListingPrice[][]) {
    const fields = countryPrices.map((prices) => {
      const { name, code, currencyCode } = prices[0].country;

      return {
        name,
        value: prices
          .map((price, i) => {
            const link = listing.getUrl(code);
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
      title: listing.name,
      description: listing.externalId,
      image: {
        url: listing.image,
        height: 200,
      },
      fields,
      footer: { text: listing.categoryName },
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
}
