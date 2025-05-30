import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";

export class AmazonAdRepository {
  private delegate;
  private prisma;
  private structure = {
    id: true,
    asin: true,
    image: true,
    name: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
    scrapedAt: true,
    category: {
      select: {
        id: true,
        name: true,
        active: true,
      },
    },
  };

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAd;
    this.prisma = prisma;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: this.structure,
    });
  }

  getForScraping(count: number, categoryIds: number[], blacklist: string[]) {
    const blacklistQuery = blacklist.map((keyword) => ({
      NOT: { name: { contains: keyword } },
    }));

    return this.delegate.findMany({
      where: {
        AND: [{ categoryId: { in: categoryIds } }, ...blacklistQuery],
      },
      take: count,
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
    });
  }

  updateScrapedAt(ids: number[]) {
    return this.prisma
      .$executeRaw`UPDATE AmazonAd SET scrapedAt = NOW() WHERE id IN (${Prisma.join(
      ids
    )})`;
  }

  getAll() {
    return this.delegate.findMany();
  }

  getCount(from?: Date, to?: Date) {
    return this.delegate.count({
      where: {
        createdAt: {
          lte: to,
          gte: from,
        },
      },
    });
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
