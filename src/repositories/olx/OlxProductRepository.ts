import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { merge } from "lodash";

export class OlxProductRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxProduct;
  }

  getAll() {
    return this.delegate.findMany();
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
    });
  }

  getByBrandAndModel(data: { model: string; brand: string }) {
    return this.delegate.findUnique({
      where: { brand_model: data },
    });
  }

  async getRelated(brand: string, model: string) {
    const product = await this.getByBrandAndModel({ brand, model });
    const avgPrice = product?.avgPrice || null;

    const firstDegree = await this.getFirstDegreeRelated(
      brand,
      model,
      avgPrice
    );
    if (
      firstDegree.length &&
      firstDegree.some((el) => el._count.productAds > 1)
    )
      return firstDegree;

    const secondDegree = await this.getSecondDegreeRelated(
      brand,
      model,
      avgPrice
    );
    if (
      secondDegree.length &&
      secondDegree.some((el) => el._count.productAds > 1)
    )
      return secondDegree;

    const thirdDegree = await this.getThirdDegreeRelated(
      brand,
      model,
      avgPrice
    );
    return thirdDegree;
  }

  getFirstDegreeRelated(brand: string, model: string, avgPrice: number | null) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        model: { equals: model },
      },
      select: this.selectRelated(avgPrice),
    });
  }

  getSecondDegreeRelated(
    brand: string,
    model: string,
    avgPrice: number | null
  ) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        model: { startsWith: model },
      },
      select: this.selectRelated(avgPrice),
    });
  }

  getThirdDegreeRelated(brand: string, model: string, avgPrice: number | null) {
    return this.delegate.findMany({
      where: {
        brand: { contains: brand },
        OR: (() =>
          model.split(" ").map((word) => ({ model: { contains: word } })))(),
      },
      take: 10,
      select: this.selectRelated(avgPrice),
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

  private selectRelated(avgPrice: number | null) {
    return {
      ...merge(
        {
          _count: { select: { productAds: true } },
          productAds: {
            ...(avgPrice && {
              where: {
                ad: {
                  price: {
                    gt: avgPrice * 0.5,
                    lt: avgPrice * 1.5,
                  },
                },
              },
            }),
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
