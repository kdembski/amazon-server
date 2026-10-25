import { PrismaClient } from "@@prisma/PrismaClient";
import { ActivityEventType, Prisma } from "@prisma/client";

export class ActivityEventRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.activityEvent;
  }

  getCount(type: ActivityEventType, from?: Date, to?: Date, channel?: string) {
    return this.delegate.count({
      where: {
        type,
        createdAt: {
          lte: to,
          gte: from,
        },
        ...(channel && { data: { path: "$.channel", equals: channel } }),
      },
    });
  }

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM ActivityEvent WHERE createdAt < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }

  // A row without data.count (a single event) counts as 1
  async getSum(type: ActivityEventType, from: Date, to: Date) {
    const [{ total }] = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT CAST(COALESCE(SUM(COALESCE(JSON_EXTRACT(data, '$.count'), 1)), 0) AS SIGNED) AS total
      FROM ActivityEvent
      WHERE type = ${type} AND createdAt >= ${from} AND createdAt <= ${to}`;
    return Number(total);
  }

  create(data: Prisma.ActivityEventCreateInput) {
    return this.delegate.create({ data });
  }

  async createMany(data: Prisma.ActivityEventCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data });
    return count;
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
