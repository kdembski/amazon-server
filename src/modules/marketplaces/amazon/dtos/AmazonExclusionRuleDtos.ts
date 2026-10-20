import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";

export interface AmazonExclusionRuleCreateDto {
  value: string;
  categoryId?: number | null;
}

export interface AmazonExclusionRuleUpdateDto {
  value?: string;
  categoryId?: number | null;
}

export interface AmazonExclusionRuleBatchDto {
  create?: AmazonExclusionRuleCreateDto[];
  update?: (AmazonExclusionRuleUpdateDto & { id: number })[];
  delete?: number[];
}

export type AmazonExclusionRuleSelectDto = Awaited<
  ReturnType<AmazonExclusionRuleRepository["getById"]>
>;
