import { Prisma, PrismaClient } from "@prisma/client";

export class OlxProductRepository {
  private prisma;

  constructor(prisma = new PrismaClient()) {
    this.prisma = prisma;
  }

  async getById(id: number) {
    return this.prisma.olxProduct.findUniqueOrThrow({
      where: { id },
    });
  }

  async create(data: Prisma.OlxProductCreateInput) {
    return this.prisma.olxProduct.create({ data });
  }

  async update(id: number, data: Prisma.OlxProductUpdateInput) {
    return this.prisma.olxProduct.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.olxProduct.delete({ where: { id } });
  }
}
