import { AmazonAdCategoryRepository } from "@/repositories/amazon/AmazonAdCategoryRepository";

export interface AmazonAdCategoryCreateDto {
  name: string;
}

export interface AmazonAdCategoryUpdateDto {
  name: string;
}

export type AmazonAdCategorySelectDto = NonNullable<
  Awaited<ReturnType<AmazonAdCategoryRepository["getById"]>>
>;
