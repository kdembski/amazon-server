import { Prisma } from "@prisma/client";
import { PrismaClient } from "@@prisma/PrismaClient";
import { merge } from "lodash";

export class OlxAdRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.olxAd;
  }

  getById(id: number) {
    return this.delegate.findUniqueOrThrow({
      where: { id },
      select: {
        ...merge(this.selectAd(), this.selectProduct()),
      },
    });
  }

  getAll() {
    return this.delegate.findMany();
  }

  getAllWithoutProductAd() {
    return this.delegate.findMany({
      where: {
        productAd: null,
      },
    });
  }

  create(data: Prisma.OlxAdCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }

  private selectAd() {
    return {
      id: true,
      olxId: true,
      olxUserId: true,
      name: true,
      price: true,
      url: true,
      categoryId: true,
      createdAt: true,
    };
  }

  private selectProduct() {
    return {
      productAd: {
        select: {
          product: {
            select: {
              brand: true,
              model: true,
            },
          },
        },
      },
    };
  }
}
