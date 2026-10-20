import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceRepository {
  private delegate;
  private structure = {
    id: true,
    adId: true,
    countryId: true,
    value: true,
    dispatchFrom: true,
    createdAt: true,
    updatedAt: true,
    country: {
      select: {
        tld: true,
        active: true,
        country: {
          select: {
            id: true,
            name: true,
            code: true,
            currencyId: true,
            currency: true,
          },
        },
      },
    },
  };

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdPrice;
  }

  getById(id: number) {
    return this.delegate.findUnique({
      where: { id },
      select: this.structure,
    });
  }

  // Groups keep the order of each country's newest price; prices inside a group are newest first.
  async getRecentByAd(adId: number, since: Date) {
    const prices = await this.delegate.findMany({
      where: { adId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: this.structure,
    });

    const countryPrices = new Map<number, typeof prices>();
    for (const price of prices) {
      const group = countryPrices.get(price.countryId) ?? [];
      countryPrices.set(price.countryId, [...group, price]);
    }
    return [...countryPrices.values()];
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
