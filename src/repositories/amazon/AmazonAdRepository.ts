import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { BlacklistedKeywordSelectDto } from "@/dtos/blacklist/BlacklistedKeywordDtos";

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

  getForScraping(
    count: number,
    categoryIds: number[],
    blacklistedKeywords: BlacklistedKeywordSelectDto[]
  ) {
    return this.delegate.findMany({
      where: {
        AND: [
          { categoryId: { in: categoryIds } },
          { NOT: this.getBlacklistWhereQuery(blacklistedKeywords) },
        ],
      },
      take: count,
      orderBy: {
        scrapedAt: { sort: "asc", nulls: "first" },
      },
      select: {
        id: true,
        asin: true,
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

  getBlacklistedCount(blacklistedKeywords: BlacklistedKeywordSelectDto[]) {
    return this.delegate.count({
      where: this.getBlacklistWhereQuery(blacklistedKeywords),
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

  private getBlacklistWhereQuery(keywords: BlacklistedKeywordSelectDto[]) {
    const query = keywords.map((keyword) => {
      const value = keyword.value.split("+");

      if (value.length > 1) {
        return { AND: value.map((v) => ({ name: { contains: v } })) };
      }
      return { name: { contains: value[0] } };
    });

    return { OR: query };
  }
}
