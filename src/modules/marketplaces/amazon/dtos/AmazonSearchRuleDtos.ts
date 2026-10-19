import { AmazonSearchRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonSearchRuleRepository";

export interface AmazonSearchRuleCreateDto {
  value: string;
  categoryId?: number | null;
}

export interface AmazonSearchRuleUpdateDto {
  value?: string;
  categoryId?: number | null;
}

export type AmazonSearchRuleSelectDto = Awaited<
  ReturnType<AmazonSearchRuleRepository["getById"]>
>;
