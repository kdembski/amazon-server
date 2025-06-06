import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";
import { roundToTwoDecimals } from "@/helpers/number";

export class DiscordConversionErrorService {
  private service;

  constructor(service = new DiscordService()) {
    this.service = service;
  }

  async send(ad: AmazonAdSelectDto, prices: AmazonAdPriceSelectDto[]) {
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
            value: `[${roundToTwoDecimals(
              price.value
            )} PLN](https://www.amazon.${price.country.code}/dp/${ad.asin})`,
          };
        }),
      ],
      footer: { text: ad.category.name },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : 0,
    };

    this.service.send({ embeds: [embed] });
  }

  setChannel(channel: string) {
    this.service.client = `DISCORD_CONVERSION_ERROR_${channel}_TOKEN`;
  }
}
