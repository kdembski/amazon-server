import { PrismaClient } from "@@prisma/PrismaClient";
import { BusinessLogType, Prisma } from "@prisma/client";

export class BusinessLogRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.businessLog;
  }

  getCount(type: BusinessLogType, from?: Date, to?: Date, channel?: string) {
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
        .$executeRaw`DELETE FROM BusinessLog WHERE createdAt < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }

  // A row without data.count (a single event) counts as 1
  async getSum(type: BusinessLogType, from: Date, to: Date) {
    const [{ total }] = await this.prisma.$queryRaw<{ total: bigint }[]>`
      SELECT CAST(COALESCE(SUM(COALESCE(JSON_EXTRACT(data, '$.count'), 1)), 0) AS SIGNED) AS total
      FROM BusinessLog
      WHERE type = ${type} AND createdAt >= ${from} AND createdAt <= ${to}`;
    return Number(total);
  }

  async getData(type: BusinessLogType, from: Date, to: Date) {
    const rows = await this.delegate.findMany({
      where: { type, createdAt: { gte: from, lte: to } },
      select: { data: true },
    });
    return rows.map((row) => row.data);
  }

  // hour = epoch seconds of the UTC hour start, independent of the session time zone
  async getSumByTypeChannelAndHour(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<
      { type: BusinessLogType; channel: string | null; hour: bigint; value: bigint }[]
    >`
      SELECT type, JSON_UNQUOTE(JSON_EXTRACT(data, '$.channel')) AS channel,
        CAST(FLOOR(UNIX_TIMESTAMP(createdAt) / 3600) * 3600 AS SIGNED) AS hour,
        CAST(SUM(COALESCE(JSON_EXTRACT(data, '$.count'), 1)) AS SIGNED) AS value
      FROM BusinessLog
      WHERE createdAt >= ${from} AND createdAt < ${to}
      GROUP BY type, channel, hour`;
    return rows.map((row) => ({
      type: row.type,
      channel: row.channel,
      hour: Number(row.hour),
      value: Number(row.value),
    }));
  }

  create(data: Prisma.BusinessLogCreateInput) {
    return this.delegate.create({ data });
  }

  async createMany(data: Prisma.BusinessLogCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data });
    return count;
  }

  delete(id: number) {
    return this.delegate.delete({ where: { id } });
  }
}
