import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { first, merge } from "lodash";

export class OlxProductRepository {
  private delegate;
  private prisma;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxProduct;
    this.prisma = prisma;
  }

  getAll() {
    return this.delegate.findMany();
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
    });
  }

  getRelated(brand: string, model: string) {
    const firstDegree = this.getFirstDegreeRelated(brand, model);
    if (firstDegree) return firstDegree;

    const secondDegree = this.getSecondDegreeRelated(brand, model);
    if (secondDegree) return secondDegree;

    const thirdDegree = this.getThirdDegreeRelated(brand, model);
    return thirdDegree;
  }

  getFirstDegreeRelated(brand: string, model: string) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        model: { equals: model },
      },
      select: this.selectRelated(),
    });
  }

  getSecondDegreeRelated(brand: string, model: string) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        model: { contains: model },
      },
      select: this.selectRelated(),
    });
  }

  getThirdDegreeRelated(brand: string, model: string) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        model: { in: model.split(" ") },
      },
      select: this.selectRelated(),
    });
  }

  getByBrandAndModel(data: { model: string; brand: string }) {
    return this.delegate.findUnique({
      where: { brand_model: data },
    });
  }

  getPricesFromLastMonth() {
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

  getAllWithAdsCount() {
    return this.delegate.findMany({
      select: {
        ...merge(
          {
            _count: { select: { productAds: true } },
          },
          this.selectProduct()
        ),
      },
    });
  }

  create(data: Prisma.OlxProductCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.OlxProductUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  private selectProduct() {
    return {
      id: true,
      brand: true,
      model: true,
      avgPrice: true,
    };
  }

  private selectCategory() {
    return {
      productAds: {
        select: {
          ad: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    };
  }

  private selectAd() {
    return {
      productAds: {
        select: {
          ad: {
            select: {
              id: true,
              name: true,
              price: true,
              url: true,
              createdAt: true,
            },
          },
        },
      },
    };
  }

  private selectRelated() {
    return {
      ...merge(
        {
          _count: { select: { productAds: true } },
          productAds: {
            where: {
              ad: {
                price: {
                  gt:
                    (this.prisma.olxProduct.fields
                      .avgPrice as unknown as number) * 0.7,
                  lt:
                    (this.prisma.olxProduct.fields
                      .avgPrice as unknown as number) * 1.3,
                },
              },
            },
            orderBy: {
              ad: {
                createdAt: "desc",
              },
            },
            take: 10,
          },
        } as const,
        this.selectProduct(),
        this.selectAd()
      ),
    };
  }
}
