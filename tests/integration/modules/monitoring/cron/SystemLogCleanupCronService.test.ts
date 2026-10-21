import { describe, expect, it } from "vitest";
import { SystemLogCleanupCronService } from "@/modules/monitoring/cron/SystemLogCleanupCronService";
import { prisma } from "../../../../support/integration/db";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);
const seedLog = (createdAt: Date) =>
  prisma.systemLog.create({
    data: { level: "info", source: "test", message: "m", createdAt },
  });

describe("SystemLogCleanupCronService (MySQL)", () => {
  it("removes only system logs older than 30 days", async () => {
    await seedLog(daysAgo(31));
    await seedLog(daysAgo(45));
    const kept = await seedLog(daysAgo(29));

    await new SystemLogCleanupCronService().run();

    expect(
      (await prisma.systemLog.findMany({ where: { source: "test" } })).map((row) => row.id)
    ).toEqual([kept.id]);
  });
});
