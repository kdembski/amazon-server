import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonCountryRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonCountry;
  }

  getById(countryId: number) {
    return this.delegate.findUnique({ where: { countryId } });
  }

  getAll() {
    return this.delegate.findMany();
  }

  getForScraping() {
    return this.delegate.findMany({
      where: { scraped: true },
      select: { countryId: true, tld: true, proxyType: true, pdpSource: true, priority: true },
    });
  }

  create(data: Prisma.AmazonCountryUncheckedCreateInput) {
    return this.delegate.create({ data });
  }

  update(countryId: number, data: Prisma.AmazonCountryUncheckedUpdateInput) {
    return this.delegate.update({ where: { countryId }, data });
  }
}
