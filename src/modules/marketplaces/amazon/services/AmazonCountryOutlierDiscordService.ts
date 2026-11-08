import { AmazonAdEmbedBuilder } from "@/modules/marketplaces/amazon/services/AmazonAdEmbedBuilder";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";

export class AmazonCountryOutlierDiscordService {
  private service;
  private embedBuilder;

  constructor(service = new DiscordChannelService(), embedBuilder = new AmazonAdEmbedBuilder()) {
    this.service = service;
    this.embedBuilder = embedBuilder;
  }

  async send(
    channelId: number,
    ad: AmazonAdSelectDto,
    prices: ListingPrice[],
    difference?: number
  ) {
    const fields = prices.map((price, i) => {
      const link = `[${NumberFormatter.round(price.value, 2)} PLN](${price.url})`;
      return {
        name: price.country.name,
        value: i === 0 && difference ? `${link} *(${difference}%)*` : link,
      };
    });
    const embed = this.embedBuilder.build(ad, fields);

    await this.service.send(channelId, { embeds: [embed] }, { asin: ad.asin });
  }
}
