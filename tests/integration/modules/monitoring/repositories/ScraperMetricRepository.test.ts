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
