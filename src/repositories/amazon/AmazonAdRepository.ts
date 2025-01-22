import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";

export class AmazonAdRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAd;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        asin: true,
        categoryId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  getForScraping() {
    return this.delegate.findMany({
      take: 50,
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
    });
  }

  getAll() {
    return this.delegate.findMany();
  }

  create(data: Prisma.AmazonAdCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonAdUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
