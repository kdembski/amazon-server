import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonSearchRuleRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
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
}
