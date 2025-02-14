import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdPriceRepository {
  private delegate;
  private structure = {
    id: true,
    adId: true,
    countryId: true,
    value: true,
    createdAt: true,
    updatedAt: true,
    country: {
      select: {
        id: true,
        name: true,
        code: true,
        currencyId: true,
        currency: true,
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

  getByAdAndCountry(data: { adId: number; countryId: number }) {
    return this.delegate.findMany({
      where: { adId: data.adId, countryId: data.countryId },
      orderBy: { createdAt: "desc" },
      select: this.structure,
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
