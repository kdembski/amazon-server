import { Prisma, PrismaClient } from "@prisma/client";

export class OlxProductRepository {
  private delegate;

  constructor(prisma = new PrismaClient()) {
    this.delegate = prisma.olxProduct;
  }

  async getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
    });
  }

  async getByBrandAndModel(data: { model: string; brand: string }) {
    return this.delegate.findUnique({
      where: { brand_model: data },
    });
  }

  async getPricesFromLastMonth() {
    const today = new Date();
    return this.delegate.findMany({
      select: {
        id: true,
        productAds: {
          where: {
            createdAt: { gte: new Date(today.setMonth(today.getMonth() - 1)) },
          },
          select: { ad: { select: { price: true } } },
        },
      },
    });
  }

  async getAllWithAdsCount() {
    return this.delegate.findMany({
      select: {
        id: true,
        brand: true,
        model: true,
        _count: { select: { productAds: true } },
      },
    });
  }

  async create(data: Prisma.OlxProductCreateInput) {
    return this.delegate.create({ data });
  }

  async update(id: number, data: Prisma.OlxProductUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
