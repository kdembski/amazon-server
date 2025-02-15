import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { DiscordService } from "@/services/discord/DiscordService";

export class DiscordConversionErrorService {
  private service;

  constructor(service = new DiscordService()) {
    const token = process.env.DISCORD_CONVERSION_ERROR_TOKEN;

    if (!token)
      throw Error("DISCORD_CONVERSION_ERROR_TOKEN env variable is missing");

    service.init(token);
    this.service = service;
  }

  send(
    ad: AmazonAdSelectDto,
    prices: AmazonAdPriceCreateDto[],
    productName?: string
  ) {
    const allegroSearch = productName?.replaceAll(" ", "%20");
    const allegroLink = `https://allegro.pl/listing?string=${allegroSearch}&stan=nowe`;

    const embed = {
      title: ad.name,
      description: ad.asin + (productName ? ` [Allegro](${allegroLink})` : ""),
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

    this.service.send({ embeds: [embed] });
  }
}
