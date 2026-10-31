import { describe, expect, it, vi } from "vitest";
import { BusinessLogCleanupCronService } from "@/modules/monitoring/cron/BusinessLogCleanupCronService";
import { prisma } from "../../../../support/integration/db";
import { seedBusinessLog } from "../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("BusinessLogCleanupCronService (MySQL)", () => {
  it("removes only logs older than 30 days", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedBusinessLog({ type: "ad_scraped", createdAt: daysAgo(31) });
    await seedBusinessLog({ type: "price_drop_sent", createdAt: daysAgo(45) });
    const kept = await seedBusinessLog({ type: "ad_scraped", createdAt: daysAgo(29) });

    await new BusinessLogCleanupCronService().run();

    expect((await prisma.businessLog.findMany()).map((log) => log.id)).toEqual([
      kept.id,
    ]);
  });
});
