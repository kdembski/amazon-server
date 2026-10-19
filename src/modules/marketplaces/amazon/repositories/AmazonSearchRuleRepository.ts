import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export interface AmazonSearchRuleBatchInput {
  create: Prisma.AmazonSearchRuleUncheckedCreateInput[];
  update: { id: number; data: Prisma.AmazonSearchRuleUncheckedUpdateInput }[];
  delete: number[];
}

export class AmazonSearchRuleRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.amazonSearchRule;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany({ orderBy: { id: "asc" } });
  }

  create(data: Prisma.AmazonSearchRuleUncheckedCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonSearchRuleUncheckedUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  // Deletes and updates run before creates, so a batch can replace a rule
  // with one of the same value and category.
  applyBatch(batch: AmazonSearchRuleBatchInput) {
    return this.prisma.$transaction([
      ...batch.delete.map((id) => this.delegate.delete({ where: { id } })),
      ...batch.update.map(({ id, data }) =>
        this.delegate.update({ where: { id }, data })
      ),
      ...batch.create.map((data) => this.delegate.create({ data })),
    ]);
  }
}
