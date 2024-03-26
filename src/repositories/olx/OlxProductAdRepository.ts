import { Prisma, PrismaClient } from "@prisma/client";

export class OlxProductAdRepository {
  private prisma;

  constructor(prisma = new PrismaClient()) {
    this.prisma = prisma;
  }

  async getById(id: number) {
    return this.prisma.olxProductAd.findUniqueOrThrow({
      where: { id },
    });
  }

  async create(data: Prisma.OlxProductAdCreateInput) {
    return this.prisma.olxProductAd.create({ data });
  }

  async delete(id: number) {
    return this.prisma.olxProductAd.delete({ where: { id } });
  }
}
