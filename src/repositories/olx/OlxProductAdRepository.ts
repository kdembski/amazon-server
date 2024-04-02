import { Prisma, PrismaClient } from "@prisma/client";

export class OlxProductAdRepository {
  private delegate;

  constructor(prisma = new PrismaClient()) {
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
