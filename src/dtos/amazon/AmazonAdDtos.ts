import { AmazonAdPriceCreateDto } from "./AmazonAdPriceDtos";

export interface AmazonAdCreateDto {
  asin: string;
  categoryName: string;
}
export interface AmazonAdUpdateDto {
  categoryId: number;
  prices: AmazonAdPriceCreateDto[];
}
