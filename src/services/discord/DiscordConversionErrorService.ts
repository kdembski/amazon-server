import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";

export class DiscordConversionErrorService {
  private _service;

  constructor(service = new DiscordService()) {
    this._service = service;
  }

  send(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
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

    this._service.send({ embeds: [embed] });
  }

  setChannel(channel: string) {
    this._service.client = `DISCORD_CONVERSION_ERROR_${channel}_TOKEN`;
  }
}
