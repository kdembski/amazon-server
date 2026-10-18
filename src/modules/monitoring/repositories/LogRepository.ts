import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class LogRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.log;
  }

  getCountByEvent(event: string, from?: Date, to?: Date) {
    return this.delegate.count({
      where: {
        event,
        createdAt: {
          lte: to,
          gte: from,
        },
      },
    });
  }

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM Log WHERE createdAt < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }

  create(data: Prisma.LogCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
