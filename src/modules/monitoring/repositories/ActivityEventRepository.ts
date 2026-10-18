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

  create(data: Prisma.ActivityEventCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
