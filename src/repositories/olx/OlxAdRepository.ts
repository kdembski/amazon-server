import { Prisma, PrismaClient } from "@prisma/client";

export class OlxAdRepository {
  private prisma;

  constructor(prisma = new PrismaClient()) {
    this.prisma = prisma;
  }

  async getById(id: number) {
    return this.prisma.olxAd.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
  }

  async create(data: Prisma.OlxAdCreateInput) {
    return this.prisma.olxAd.create({ data });
  }

  async delete(id: number) {
    return this.prisma.olxAd.delete({ where: { id } });
  }
}
