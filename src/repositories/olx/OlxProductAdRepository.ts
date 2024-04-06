import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";

export class OlxProductAdRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxProductAd;
  }

  async getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
    });
  }

  async create(data: Prisma.OlxProductAdCreateInput) {
    return this.delegate.create({ data });
  }

  async delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
