import _ from "lodash";
import { describe, expect, it } from "vitest";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { FIXED_DATE } from "../../../../support/factories";
import { prisma } from "../../../../support/integration/db";
import { seedScraperMetric } from "../../../../support/integration/seed";

const repository = new ScraperMetricRepository(prisma);
const minute = (n: number) => new Date(FIXED_DATE.getTime() + n * 60_000);

describe("ScraperMetricRepository (MySQL)", () => {
  it("createMany stores rows with and without labels", async () => {
    const base = {
      scraper: "amazon-pdp",
      marketplace: "amazon" as const,
      flow: "pdp",
      periodStart: minute(0),
      createdAt: minute(1),
    };

    const count = await repository.createMany([
      { ...base, metric: "requests", country: "de", outcome: "ok", value: 120 },
      { ...base, metric: "bytes_in", country: null, outcome: null, value: 1843200 },
    ]);

    expect(count).toBe(2);
    const rows = await prisma.scraperMetric.findMany({ orderBy: { id: "asc" } });
    expect(rows).toMatchObject([
      { metric: "requests", country: "de", outcome: "ok", value: 120 },
      { metric: "bytes_in", country: null, outcome: null, value: 1843200 },
    ]);
  });

  it("sumByScraper sums per scraper, metric and outcome inside [from, to) for the KPI metrics only", async () => {
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 3, periodStart: minute(0) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 4, periodStart: minute(1) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 100, periodStart: minute(60) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 9, periodStart: minute(5), scraper: "amazon-plp" });
    await seedScraperMetric({ metric: "bytes_in", outcome: null, value: 7, periodStart: minute(2) });
    await seedScraperMetric({ metric: "pending", outcome: null, value: 50, periodStart: minute(3) });

    const result = await repository.sumByScraper(minute(0), minute(60));

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        { scraper: "amazon-pdp", metric: "requests", outcome: "ok", value: 7 },
        { scraper: "amazon-plp", metric: "requests", outcome: "ok", value: 9 },
        { scraper: "amazon-pdp", metric: "bytes_in", outcome: null, value: 7 },
      ])
    );
  });

  it("getSumByScraperAndHour sums per scraper, metric, outcome and UTC hour inside [from, to)", async () => {
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 3, periodStart: minute(0) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 4, periodStart: minute(59) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 5, periodStart: minute(60) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 9, periodStart: minute(5), scraper: "amazon-plp" });
    await seedScraperMetric({ metric: "pending", outcome: null, value: 50, periodStart: minute(3) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 100, periodStart: minute(120) });

    const result = await repository.getSumByScraperAndHour(minute(0), minute(120));
    const hour = (n: number) => minute(n * 60).getTime() / 1000;

    expect(result).toHaveLength(3);
    expect(result).toEqual(
      expect.arrayContaining([
        { scraper: "amazon-pdp", metric: "requests", outcome: "ok", hour: hour(0), value: 7 },
        { scraper: "amazon-pdp", metric: "requests", outcome: "ok", hour: hour(1), value: 5 },
        { scraper: "amazon-plp", metric: "requests", outcome: "ok", hour: hour(0), value: 9 },
      ])
    );
  });

  it("getSumByHourAnd sums per scraper or country, metric, outcome and UTC hour without the rows lacking the key", async () => {
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "de", value: 3, periodStart: minute(0) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "de", value: 4, periodStart: minute(30), scraper: "amazon-plp" });
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "pl", value: 5, periodStart: minute(60) });
    await seedScraperMetric({ metric: "bytes_in", outcome: "proxy", value: 7, periodStart: minute(2) });

    const countries = await repository.getSumByHourAnd("country", minute(0), minute(120));
    const scrapers = await repository.getSumByHourAnd("scraper", minute(0), minute(120));
    const hour = (n: number) => minute(n * 60).getTime() / 1000;

    expect(countries).toHaveLength(2);
    expect(countries).toEqual(
      expect.arrayContaining([
        { group: "de", metric: "requests", outcome: "ok", hour: hour(0), value: 7 },
        { group: "pl", metric: "requests", outcome: "ok", hour: hour(1), value: 5 },
      ])
    );
    expect(scrapers).toHaveLength(4);
    expect(scrapers).toEqual(
      expect.arrayContaining([
        { group: "amazon-pdp", metric: "requests", outcome: "ok", hour: hour(0), value: 3 },
        { group: "amazon-plp", metric: "requests", outcome: "ok", hour: hour(0), value: 4 },
        { group: "amazon-pdp", metric: "bytes_in", outcome: "proxy", hour: hour(0), value: 7 },
      ])
    );
  });

  it("rollUpHour stores the hour's KPI sums once, and the hourly reads match the raw ones", async () => {
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "de", value: 3, periodStart: minute(0) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "de", value: 4, periodStart: minute(59) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", country: "pl", value: 5, periodStart: minute(10) });
    await seedScraperMetric({ metric: "bytes_in", outcome: null, value: 7, periodStart: minute(2) });
    await seedScraperMetric({ metric: "pending", outcome: null, value: 50, periodStart: minute(3) });
    await seedScraperMetric({ metric: "requests", outcome: "ok", value: 100, periodStart: minute(60) });

    expect(await repository.rollUpHour(minute(0))).toBe(3);
    expect(await repository.rollUpHour(minute(0))).toBe(3);

    expect(await prisma.scraperMetricHourly.count()).toBe(3);
    expect(await repository.getRolledUpUntil()).toEqual(minute(60));
    expect(await repository.getOldestPeriodStart()).toEqual(minute(0));
    const sort = <T>(rows: T[]) => _.sortBy(rows, (row) => JSON.stringify(row));
    for (const read of <((hourly: boolean) => Promise<object[]>)[]>[
      (hourly: boolean) => repository.sumByScraper(minute(0), minute(60), hourly),
      (hourly: boolean) => repository.sumByScraperAnd("country", minute(0), minute(60), hourly),
      (hourly: boolean) => repository.getSumByScraperAndHour(minute(0), minute(60), hourly),
      (hourly: boolean) => repository.getSumByHourAnd("country", minute(0), minute(60), hourly),
    ]) {
      expect(sort(await read(true))).toEqual(sort(await read(false)));
    }
  });

  it("deleteOlderThan removes hourly sums before the date", async () => {
    await seedScraperMetric({ periodStart: minute(0) });
    await seedScraperMetric({ periodStart: minute(60) });
    await repository.rollUpHour(minute(0));
    await repository.rollUpHour(minute(60));

    await repository.deleteOlderThan(minute(60));

    expect((await prisma.scraperMetricHourly.findMany()).map((row) => row.periodStart)).toEqual([
      minute(60),
    ]);
  });

  it("deleteOlderThan removes rows with periodStart strictly before the date across batches", async () => {
    await seedScraperMetric({ periodStart: minute(0) });
    await seedScraperMetric({ periodStart: minute(1) });
    await seedScraperMetric({ periodStart: minute(2) });
    const boundary = await seedScraperMetric({ periodStart: minute(3) });
    const later = await seedScraperMetric({ periodStart: minute(4) });

    expect(await repository.deleteOlderThan(minute(3), 2)).toBe(3);
    expect((await prisma.scraperMetric.findMany()).map((r) => r.id)).toEqual([
      boundary.id,
      later.id,
    ]);
  });
});
