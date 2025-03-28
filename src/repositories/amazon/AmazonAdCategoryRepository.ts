import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdCategoryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdCategory;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({ where: { id } });
  }

  getAll() {
    return this.delegate.findMany();
  }

  getForScraping() {
    return this.delegate.findFirstOrThrow({
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
    });
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
