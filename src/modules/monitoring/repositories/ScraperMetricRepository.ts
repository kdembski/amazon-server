import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";
import { ScraperMetricSum } from "@/modules/monitoring/dtos/ScraperMetricDtos";

const SUMMARY_METRICS = [
  "requests",
  "responses",
  "items",
  "item_attempts",
  "connections",
  "bytes_in",
  "bytes_out",
];

export class ScraperMetricRepository {
  private prisma;
  private delegate;

  constructor(prisma = PrismaClient.getInstance()) {
    this.prisma = prisma;
    this.delegate = prisma.scraperMetric;
  }

  async createMany(data: Prisma.ScraperMetricCreateManyInput[]) {
    const { count } = await this.delegate.createMany({ data });
    return count;
  }

  async sumByScraper(from: Date, to: Date): Promise<ScraperMetricSum[]> {
    const groups = await this.delegate.groupBy({
      by: ["scraper", "metric", "outcome"],
      where: {
        periodStart: { gte: from, lt: to },
        metric: { in: SUMMARY_METRICS },
      },
      _sum: { value: true },
    });

    return groups.map((group) => ({
      scraper: group.scraper,
      metric: group.metric,
      outcome: group.outcome,
      value: group._sum.value ?? 0,
    }));
  }

  // hour = epoch seconds of the UTC hour start, independent of the session time zone
  async getSumByScraperAndHour(from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<(ScraperMetricSum & { hour: bigint })[]>`
      SELECT scraper, metric, outcome,
        CAST(FLOOR(UNIX_TIMESTAMP(periodStart) / 3600) * 3600 AS SIGNED) AS hour,
        SUM(value) AS value
      FROM ScraperMetric
      WHERE periodStart >= ${from} AND periodStart < ${to}
        AND metric IN (${Prisma.join(SUMMARY_METRICS)})
      GROUP BY scraper, metric, outcome, hour`;
    return rows.map((row) => ({ ...row, hour: Number(row.hour), value: Number(row.value) }));
  }

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM ScraperMetric WHERE periodStart < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);

    return total;
  }
}
