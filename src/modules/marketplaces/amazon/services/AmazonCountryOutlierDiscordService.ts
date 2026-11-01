import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";
import { roundToTwoDecimals } from "@/shared/utils/number";

export class AmazonCountryOutlierDiscordService {
  private service;

  constructor(service = new DiscordChannelService()) {
    this.service = service;
  }

  async send(
    channelId: number,
    ad: AmazonAdSelectDto,
    prices: ListingPrice[],
    difference?: number
  ) {
    const embed = {
      title: ad.name,
      description: ad.asin,
      image: {
        url: ad.image,
        height: 200,
      },
      fields: [
        ...prices.map((price, i) => {
          const link = `[${roundToTwoDecimals(price.value)} PLN](${price.url})`;
          return {
            name: price.country.name,
            value: i === 0 && difference ? `${link} *(${difference}%)*` : link,
          };
        }),
      ],
      footer: { text: ad.category.name },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : undefined,
    };

    await this.service.send(channelId, { embeds: [embed] }, { asin: ad.asin });
  }
}
