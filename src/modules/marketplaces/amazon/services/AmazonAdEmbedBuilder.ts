import { APIEmbedField } from "discord.js";
import { AmazonAdSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdDtos";

// The Discord embed of an anomaly alert about an ad; red in development
export class AmazonAdEmbedBuilder {
  build(ad: AmazonAdSelectDto, fields: APIEmbedField[]) {
    return {
      title: ad.name,
      description: ad.asin,
      image: {
        url: ad.image,
        height: 200,
      },
      fields,
      footer: { text: ad.category.name },
      color: process.env.NODE_ENV === "development" ? 0xe50000 : undefined,
    };
  }
}
