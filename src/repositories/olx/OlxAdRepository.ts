import { Prisma, PrismaClient } from "@prisma/client";

export class OlxAdRepository {
  private delegate;

  constructor(prisma = new PrismaClient()) {
    this.delegate = prisma.olxAd;
  }

  async getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
  }

  async getAll() {
    return this.delegate.findMany();
  }

  async getAllWithoutProductAd() {
    return this.delegate.findMany({
      where: {
        productAd: null,
      },
      include: {
        productAd: true,
      },
    });
  }

  async create(data: Prisma.OlxAdCreateInput) {
    return this.delegate.create({ data });
  }

  async delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
