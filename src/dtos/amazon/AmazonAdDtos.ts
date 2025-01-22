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
