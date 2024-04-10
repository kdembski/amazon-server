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

  getRelated(brand: string, model: string) {
    return this.delegate.findMany({
      where: {
        AND: [
          { brand: { contains: brand } },
          {
            OR: [
              {
                model: { contains: model },
              },
              {
                model: {
                  in: model.split(" "),
                },
              },
            ],
          },
        ],
      },
      select: {
        ...merge(
          {
            _count: { select: { productAds: true } },
            productAds: {
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
      },
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
}
