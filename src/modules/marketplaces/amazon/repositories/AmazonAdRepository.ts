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

  getByIds(ids: number[]) {
    return this.delegate.findMany({
      where: { id: { in: ids } },
      select: this.structure,
    });
  }

  // MySQL sorts NULL first in ascending order; an explicit `nulls` option
  // would turn the ORDER BY into an expression the index cannot serve.
  getForScraping(batchSize: number) {
    return this.delegate.findMany({
      where: { excluded: false },
      take: batchSize,
      orderBy: { scrapedAt: "asc" },
      select: {
        id: true,
        asin: true,
        name: true,
      },
    });
  }

  async getMaxId(where: Prisma.AmazonAdWhereInput) {
    const { _max } = await this.delegate.aggregate({ where, _max: { id: true } });
    return _max.id ?? 0;
  }

  getForMatch(where: Prisma.AmazonAdWhereInput) {
    return this.delegate.findMany({
      where,
      select: { id: true, name: true, categoryId: true, excluded: true },
    });
  }

  async setExcluded(ids: number[], excluded: boolean) {
    if (!ids.length) return 0;

    const { count } = await this.delegate.updateMany({
      where: { id: { in: ids } },
      data: { excluded },
    });
    return count;
  }

  updateScrapedAt(ids: number[]): Promise<number> {
    if (!ids.length) return Promise.resolve(0);

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

  async createMany(data: Prisma.AmazonAdCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data, skipDuplicates: true });
    return count;
  }

  update(id: number, data: Prisma.AmazonAdUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  async deleteMany(ids: number[]) {
    const { count } = await this.delegate.deleteMany({ where: { id: { in: ids } } });
    return count;
  }

}
