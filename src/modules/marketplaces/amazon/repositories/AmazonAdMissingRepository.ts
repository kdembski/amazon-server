import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdMissingRepository {
  private delegate;
  private prisma;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.amazonAdMissing;
    this.prisma = prisma;
  }

  getByAdIds(adIds: number[]) {
    return this.delegate.findMany({
      where: { adId: { in: adIds } },
      select: { adId: true, countryId: true },
    });
  }

  async createMany(data: Prisma.AmazonAdMissingCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data, skipDuplicates: true });
    return count;
  }

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM AmazonAdMissing WHERE createdAt < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }
}
