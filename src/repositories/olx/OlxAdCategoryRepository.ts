import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class OlxAdCategoryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxAdCategory;
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.OlxAdCategoryCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.OlxAdCategoryUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
