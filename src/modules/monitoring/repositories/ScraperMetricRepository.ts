import { PrismaClient } from "@@prisma/PrismaClient";
import { Prisma } from "@prisma/client";
import {
  ScraperBreakdownKey,
  ScraperCountKey,
  ScraperGroupHourSum,
  ScraperLastReport,
  ScraperMetricGroupSum,
  ScraperMetricSum,
  ScraperStatusSum,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { HOUR_MS } from "@/modules/monitoring/helpers/splitByRollup";

const SUMMARY_METRICS = [
  "requests",
  "responses",
  "items",
  "item_attempts",
  "connections",
  "bytes_in",
  "bytes_out",
];
const STATUS_METRICS = ["cpu_percent", "requests", "items", "pending", "open_connections"];

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

  async sumByScraper(from: Date, to: Date, hourly = false): Promise<ScraperMetricSum[]> {
    const groups = await this.getDelegate(hourly).groupBy({
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

  async sumByScraperAnd(
    by: ScraperBreakdownKey,
    from: Date,
    to: Date,
    hourly = false
  ): Promise<ScraperMetricGroupSum[]> {
    const groups = await this.getDelegate(hourly).groupBy({
      by: ["scraper", by, "metric", "outcome"],
      where: {
        periodStart: { gte: from, lt: to },
        metric: { in: SUMMARY_METRICS },
      },
      _sum: { value: true },
    });

    return groups.map((group) => ({
      scraper: group.scraper,
      group: group[by],
      metric: group.metric,
      outcome: group.outcome,
      value: group._sum.value ?? 0,
    }));
  }

  // Every report carries cpu_percent, so it dates the newest report of every scraper since the date
  async getLastReports(since: Date): Promise<ScraperLastReport[]> {
    const groups = await this.delegate.groupBy({
      by: ["scraper"],
      where: { periodStart: { gte: since }, metric: "cpu_percent" },
      _max: { createdAt: true },
    });

    return groups.map((group) => ({ scraper: group.scraper, reportedAt: group._max.createdAt! }));
  }

  // reports = reports with the metric, which gauges are averaged over
  async sumStatusMetrics(from: Date): Promise<ScraperStatusSum[]> {
    const rows = await this.prisma.$queryRaw<(ScraperMetricSum & { reports: bigint })[]>`
      SELECT scraper, metric, outcome, SUM(value) AS value,
        COUNT(DISTINCT periodStart) AS reports
      FROM ScraperMetric
      WHERE periodStart >= ${from} AND metric IN (${Prisma.join(STATUS_METRICS)})
      GROUP BY scraper, metric, outcome`;
    return rows.map((row) => ({ ...row, value: Number(row.value), reports: Number(row.reports) }));
  }

  // hour = epoch seconds of the UTC hour start, independent of the session time zone
  async getSumByScraperAndHour(from: Date, to: Date, hourly = false) {
    const rows = await this.prisma.$queryRaw<(ScraperMetricSum & { hour: bigint })[]>`
      SELECT scraper, metric, outcome,
        CAST(FLOOR(UNIX_TIMESTAMP(periodStart) / 3600) * 3600 AS SIGNED) AS hour,
        SUM(value) AS value
      FROM ${Prisma.raw(hourly ? "ScraperMetricHourly" : "ScraperMetric")}
      WHERE periodStart >= ${from} AND periodStart < ${to}
        AND metric IN (${Prisma.join(SUMMARY_METRICS)})
      GROUP BY scraper, metric, outcome, hour`;
    return rows.map((row) => ({ ...row, hour: Number(row.hour), value: Number(row.value) }));
  }

  // Per country, rows without one (connections and bytes of older scrapers) are left out
  async getSumByHourAnd(by: ScraperCountKey, from: Date, to: Date, hourly = false) {
    const column = Prisma.raw(by);
    const rows = await this.prisma.$queryRaw<(Omit<ScraperGroupHourSum, "hour"> & { hour: bigint })[]>`
      SELECT ${column} AS \`group\`, metric, outcome,
        CAST(FLOOR(UNIX_TIMESTAMP(periodStart) / 3600) * 3600 AS SIGNED) AS hour,
        SUM(value) AS value
      FROM ${Prisma.raw(hourly ? "ScraperMetricHourly" : "ScraperMetric")}
      WHERE periodStart >= ${from} AND periodStart < ${to}
        AND metric IN (${Prisma.join(SUMMARY_METRICS)})
        AND ${column} IS NOT NULL
      GROUP BY ${column}, metric, outcome, hour`;
    return rows.map((row) => ({ ...row, hour: Number(row.hour), value: Number(row.value) }));
  }

  // End of the newest rolled-up hour
  async getRolledUpUntil() {
    const { _max } = await this.prisma.scraperMetricHourly.aggregate({
      _max: { periodStart: true },
    });
    return _max.periodStart && new Date(_max.periodStart.getTime() + HOUR_MS);
  }

  async getOldestPeriodStart() {
    const { _min } = await this.delegate.aggregate({ _min: { periodStart: true } });
    return _min.periodStart;
  }

  async rollUpHour(hour: Date) {
    const end = new Date(hour.getTime() + HOUR_MS);
    const [, inserted] = await this.prisma.$transaction([
      this.prisma.scraperMetricHourly.deleteMany({ where: { periodStart: hour } }),
      this.prisma.$executeRaw`
        INSERT INTO ScraperMetricHourly (scraper, flow, metric, country, outcome, value, periodStart)
        SELECT scraper, flow, metric, country, outcome, SUM(value), ${hour}
        FROM ScraperMetric
        WHERE periodStart >= ${hour} AND periodStart < ${end}
          AND metric IN (${Prisma.join(SUMMARY_METRICS)})
        GROUP BY scraper, flow, metric, country, outcome`,
    ]);
    return inserted;
  }

  // The hourly table has every column the sums read, under the same names
  private getDelegate(hourly: boolean) {
    return hourly
      ? (this.prisma.scraperMetricHourly as unknown as typeof this.delegate)
      : this.delegate;
  }

  async deleteOlderThan(date: Date, batchSize = 10_000) {
    let total = 0;
    let deleted;

    do {
      deleted = await this.prisma
        .$executeRaw`DELETE FROM ScraperMetric WHERE periodStart < ${date} LIMIT ${batchSize}`;
      total += deleted;
    } while (deleted === batchSize);
    await this.prisma.scraperMetricHourly.deleteMany({ where: { periodStart: { lt: date } } });

    return total;
  }
}
