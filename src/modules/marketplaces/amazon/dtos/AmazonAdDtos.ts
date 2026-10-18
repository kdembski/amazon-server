import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdPriceCreateDto } from "./AmazonAdPriceDtos";

export interface AmazonAdCreateDto {
  asin: string;
  name: string;
  image: string;
  categoryName: string;
}
export interface AmazonAdUpdateDto {
  categoryId: number;
  name: string;
  image: string;
  prices: AmazonAdPriceCreateDto[];
}

export type AmazonAdSelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdRepository["getById"]>>
>;
