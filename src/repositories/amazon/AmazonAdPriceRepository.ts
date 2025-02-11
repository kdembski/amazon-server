import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdPrice;
  }

  getById(id: number) {
    return this.delegate.findUnique({
      where: { id },
      select: {
        id: true,
        adId: true,
        currencyId: true,
        value: true,
        createdAt: true,
        updatedAt: true,
        currency: true,
      },
    });
  }

  getByAdAndCurrency(data: { adId: number; currencyId: number }) {
    return this.delegate.findMany({
      where: { adId: data.adId, currencyId: data.currencyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        adId: true,
        currencyId: true,
        value: true,
        createdAt: true,
        updatedAt: true,
        currency: true,
      },
    });
  }

  create(data: Prisma.AmazonAdPriceCreateInput) {
    return this.delegate.create({ data });
  }

  update(id: number, data: Prisma.AmazonAdPriceUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
