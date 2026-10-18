import { describe, expect, it, vi } from "vitest";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { prisma } from "../../../../support/integration/db";
import { seedActivityEvent } from "../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("ActivityEventCleanupCronService (MySQL)", () => {
  it("removes only logs older than 30 days", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedActivityEvent({ type: "ad_scraped", createdAt: daysAgo(31) });
    await seedActivityEvent({ type: "pricing_error_sent", createdAt: daysAgo(45) });
    const kept = await seedActivityEvent({ type: "ad_scraped", createdAt: daysAgo(29) });

    await new ActivityEventCleanupCronService().run();

    expect((await prisma.activityEvent.findMany()).map((log) => log.id)).toEqual([
      kept.id,
    ]);
  });
});
