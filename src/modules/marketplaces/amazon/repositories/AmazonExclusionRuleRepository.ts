import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export interface AmazonExclusionRuleBatchInput {
  create: Prisma.AmazonExclusionRuleUncheckedCreateInput[];
  update: { id: number; data: Prisma.AmazonExclusionRuleUncheckedUpdateInput }[];
  delete: number[];
}

export class AmazonExclusionRuleRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.amazonExclusionRule;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany({ orderBy: { id: "asc" } });
  }

  create(data: Prisma.AmazonExclusionRuleUncheckedCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonExclusionRuleUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  // Deletes and updates run before creates, so a batch can replace a rule
  // with one of the same value and category.
  applyBatch(batch: AmazonExclusionRuleBatchInput) {
    return this.prisma.$transaction([
      ...batch.delete.map((id) => this.delegate.delete({ where: { id } })),
      ...batch.update.map(({ id, data }) =>
        this.delegate.update({ where: { id }, data })
      ),
      ...batch.create.map((data) => this.delegate.create({ data })),
    ]);
  }
}
