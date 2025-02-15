import { format } from "date-fns";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";

export class DiscordPricingErrorService {
  private service;

  constructor(service = new DiscordService()) {
    const token = process.env.DISCORD_PRICING_ERROR_TOKEN;

    if (!token)
      throw Error("DISCORD_PRICING_ERROR_TOKEN env variable is missing");

    service.init(token);
    this.service = service;
  }

  send(ad: AmazonAdSelectDto, marketplaces: AmazonAdPriceSelectDto[][]) {
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
}
