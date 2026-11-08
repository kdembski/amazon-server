import { BatchDeleter } from "@/shared/crud/repositories/BatchDeleter";
import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";

export class SystemLogRepository {
  private batchDeleter;
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance(), batchDeleter = new BatchDeleter(prisma)) {
    this.batchDeleter = batchDeleter;
    this.prisma = prisma;
    this.delegate = prisma.systemLog;
  }

  create(data: Prisma.SystemLogCreateInput) {
    return this.delegate.create({ data });
  }

  // hour = epoch seconds of the UTC hour start, independent of the session time zone
  async getCountByLevelAndHour(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<
      { level: "error" | "warn"; hour: bigint; value: bigint }[]
    >`
      SELECT level, CAST(FLOOR(UNIX_TIMESTAMP(createdAt) / 3600) * 3600 AS SIGNED) AS hour,
        COUNT(*) AS value
      FROM SystemLog
      WHERE level IN ('error', 'warn') AND createdAt >= ${from} AND createdAt < ${to}
      GROUP BY level, hour`;
    return rows.map((row) => ({
      level: row.level,
      hour: Number(row.hour),
      value: Number(row.value),
    }));
  }

  async getCountBySourceAndLevel(from: Date, to: Date) {
    const groups = await this.delegate.groupBy({
      by: ["source", "level"],
      where: { level: { in: ["error", "warn"] }, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    });
    return groups.map((group) => ({
      source: group.source,
      level: group.level as "error" | "warn",
      value: group._count._all,
    }));
  }

  deleteOlderThan(date: Date, batchSize = 10_000) {
    return this.batchDeleter.deleteOlderThan("SystemLog", "createdAt", date, batchSize);
  }
}
