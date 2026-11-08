import { describe, expect, it, vi } from "vitest";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { prisma } from "../../../support/integration/db";
import { seedBusinessLog } from "../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("RetentionCleanupCronService (MySQL)", () => {
  it("removes only rows older than the retention", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedBusinessLog({ type: "ad_scraped", createdAt: daysAgo(31) });
    await seedBusinessLog({ type: "price_drop_sent", createdAt: daysAgo(45) });
    const kept = await seedBusinessLog({ type: "ad_scraped", createdAt: daysAgo(29) });

    await new RetentionCleanupCronService("* * * * * *", "activity events", 30, new BusinessLogService()).run();

    expect((await prisma.businessLog.findMany()).map((log) => log.id)).toEqual([kept.id]);
  });
});
