import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";
import { AmazonAdRecentPriceRow } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { AmazonAdRecentPriceMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdRecentPriceMapper";

export class AmazonAdPriceRepository {
  private delegate;
  private prisma;
  private recentPriceMapper;
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

  constructor(
    prisma = PrismaClient.getInstance(),
    recentPriceMapper = new AmazonAdRecentPriceMapper()
  ) {
    this.delegate = prisma.amazonAdPrice;
    this.prisma = prisma;
    this.recentPriceMapper = recentPriceMapper;
  }

  getById(id: number) {
    return this.delegate.findUnique({
      where: { id },
      select: this.structure,
    });
  }

  // LATERAL reads at most count rows per country from the (adId, countryId, createdAt) index;
  // one query returns the prices with their country and currency in the shape of `structure`.
  async getRecentByAd(adId: number, count = 5) {
    const rows = await this.prisma.$queryRaw<AmazonAdRecentPriceRow[]>`
      SELECT p.id, p.adId, p.countryId, p.value, p.dispatchFrom, p.createdAt, p.updatedAt,
        ac.tld, ac.active, c.name AS countryName, c.code AS countryCode, c.currencyId,
        cu.name AS currencyName, cu.code AS currencyCode, cu.symbol AS currencySymbol,
        cu.createdAt AS currencyCreatedAt, cu.updatedAt AS currencyUpdatedAt
      FROM AmazonCountry ac
      JOIN Country c ON c.id = ac.countryId
      JOIN Currency cu ON cu.id = c.currencyId
      CROSS JOIN LATERAL (
        SELECT id, adId, countryId, value, dispatchFrom, createdAt, updatedAt FROM AmazonAdPrice
        WHERE adId = ${adId} AND countryId = ac.countryId
        ORDER BY createdAt DESC LIMIT ${count}
      ) p
      ORDER BY p.createdAt DESC`;
    return this.recentPriceMapper.toCountryGroups(rows);
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

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM AmazonAdPrice WHERE createdAt < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }
}
