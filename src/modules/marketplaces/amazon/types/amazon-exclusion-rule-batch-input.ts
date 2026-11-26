import { Prisma } from "@prisma/client";

export interface AmazonExclusionRuleBatchInput {
  create: Prisma.AmazonExclusionRuleUncheckedCreateInput[];
  update: { id: number; data: Prisma.AmazonExclusionRuleUncheckedUpdateInput }[];
  delete: number[];
}
