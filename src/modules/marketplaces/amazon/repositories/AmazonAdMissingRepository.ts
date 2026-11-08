import { BatchDeleter } from "@/shared/crud/repositories/BatchDeleter";
import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class AmazonAdMissingRepository {
  private batchDeleter;
  private delegate;
  private prisma;

  constructor(prisma = PrismaClient.getInstance(), batchDeleter = new BatchDeleter(prisma)) {
    this.batchDeleter = batchDeleter;
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

  deleteOlderThan(date: Date, batchSize = 10_000) {
    return this.batchDeleter.deleteOlderThan("AmazonAdMissing", "createdAt", date, batchSize);
  }
}
