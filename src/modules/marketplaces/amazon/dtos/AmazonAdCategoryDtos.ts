import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";

export interface AmazonAdCategoryCreateDto {
  name: string;
}

export interface AmazonAdCategoryUpdateDto {
  name: string;
}

export type AmazonAdCategorySelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdCategoryRepository["getById"]>>
>;
