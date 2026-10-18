import { describe, expect, it, vi } from "vitest";
import { LogCleanupCronService } from "@/modules/monitoring/cron/LogCleanupCronService";
import { prisma } from "../../../../support/integration/db";
import { seedLog } from "../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("LogCleanupCronService (MySQL)", () => {
  it("removes only logs older than 30 days", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedLog({ event: "ad_scraped", createdAt: daysAgo(31) });
    await seedLog({ event: "pricing_error_sent", createdAt: daysAgo(45) });
    const kept = await seedLog({ event: "ad_scraped", createdAt: daysAgo(29) });

    await new LogCleanupCronService().run();

    expect((await prisma.log.findMany()).map((log) => log.id)).toEqual([
      kept.id,
    ]);
  });
});
