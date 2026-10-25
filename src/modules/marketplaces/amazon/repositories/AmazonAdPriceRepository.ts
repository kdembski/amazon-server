import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceRepository {
  private delegate;
  private prisma;
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
    this.prisma = prisma;
  }

  getById(id: number) {
    return this.delegate.findUnique({
      where: { id },
      select: this.structure,
    });
  }

  // Groups keep the order of each country's newest price; prices inside a group are newest first.
  // LATERAL reads at most count rows per country from the (adId, countryId, createdAt) index.
  async getRecentByAd(adId: number, count = 5) {
    const rows = await this.prisma.$queryRaw<{ id: number }[]>`
      SELECT p.id FROM AmazonCountry c, LATERAL (
        SELECT id FROM AmazonAdPrice
        WHERE adId = ${adId} AND countryId = c.countryId
        ORDER BY createdAt DESC LIMIT ${count}
      ) p`;
    if (!rows.length) return [];

    const prices = await this.delegate.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
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

  async createMany(data: Prisma.AmazonAdPriceCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data });
    return count;
  }

  update(id: number, data: Prisma.AmazonAdPriceUpdateInput) {
    return this.delegate.update({ where: { id }, data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
