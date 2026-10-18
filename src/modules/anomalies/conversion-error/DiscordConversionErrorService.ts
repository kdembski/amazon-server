import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { DiscordService } from "@/shared/discord/DiscordService";
import { roundToTwoDecimals } from "@/shared/utils/number";

export class DiscordConversionErrorService {
  private service;

  constructor(service = new DiscordService()) {
    this.service = service;
  }

  async send(listing: Listing, prices: ListingPrice[]) {
    const embed = {
      title: listing.name,
      description: listing.externalId,
      image: {
        url: listing.image,
        height: 200,
      },
      fields: [
        ...prices.map((price) => {
          return {
            name: price.country.name,
            value: `[${roundToTwoDecimals(price.value)} PLN](${listing.getUrl(
              price.country.code
            )})`,
          };
        }),
      ],
      footer: { text: listing.categoryName },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : undefined,
    };

    this.service.send({ embeds: [embed] });
  }

  setChannel(channel: string) {
    this.service.client = `DISCORD_CONVERSION_ERROR_${channel}_TOKEN`;
  }
}
