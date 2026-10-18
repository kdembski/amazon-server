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
