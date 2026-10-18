import { describe, expect, it, vi } from "vitest";
import { ScraperMetricCleanupCronService } from "@/modules/monitoring/cron/ScraperMetricCleanupCronService";
import { prisma } from "../../../../support/integration/db";
import { seedScraperMetric } from "../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("ScraperMetricCleanupCronService (MySQL)", () => {
  it("removes only scraper metrics older than 30 days", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedScraperMetric({ periodStart: daysAgo(31) });
    await seedScraperMetric({ periodStart: daysAgo(45) });
    const kept = await seedScraperMetric({ periodStart: daysAgo(29) });

    await new ScraperMetricCleanupCronService().run();

    expect(
      (await prisma.scraperMetric.findMany()).map((row) => row.id)
    ).toEqual([kept.id]);
  });
});
