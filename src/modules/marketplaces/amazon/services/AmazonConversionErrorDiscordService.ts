import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { DiscordService } from "@/shared/discord/DiscordService";
import { roundToTwoDecimals } from "@/shared/utils/number";

export class AmazonConversionErrorDiscordService {
  private service;

  constructor(service = new DiscordService()) {
    this.service = service;
  }

  async send(ad: AmazonAdSelectDto, prices: ListingPrice[]) {
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
            value: `[${roundToTwoDecimals(price.value)} PLN](${this.getUrl(
              ad,
              price.country.code
            )})`,
          };
        }),
      ],
      footer: { text: ad.category.name },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : undefined,
    };

    this.service.send({ embeds: [embed] });
  }

  setChannel(channel: string) {
    this.service.client = `DISCORD_CONVERSION_ERROR_${channel}_TOKEN`;
  }

  private getUrl(ad: AmazonAdSelectDto, countryCode: string) {
    return `https://www.amazon.${countryCode}/dp/${ad.asin}`;
  }
}
