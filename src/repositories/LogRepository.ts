import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class LogRepository {
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.delegate = prisma.log;
  }

  getByEvent(event: string, from?: Date, to?: Date) {
    return this.delegate.findMany({
      where: {
        event,
        createdAt: {
          lte: to,
          gte: from,
        },
      },
    });
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

  create(data: Prisma.LogCreateInput) {
    return this.delegate.create({ data });
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
