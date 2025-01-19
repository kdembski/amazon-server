import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdCategoryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdCategory;
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.AmazonAdCategoryCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonAdCategoryUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
