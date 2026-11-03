import { describe, expect, it } from "vitest";
import { AmazonAdMissingCleanupCronService } from "@/modules/marketplaces/amazon/cron/AmazonAdMissingCleanupCronService";
import { prisma } from "../../../../../support/integration/db";
import { seedAdMissing } from "../../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("AmazonAdMissingCleanupCronService (MySQL)", () => {
  it("removes only missing countries stored more than 30 days ago", async () => {
    await seedAdMissing({ createdAt: daysAgo(31) });
    await seedAdMissing({ createdAt: daysAgo(60) });
    const kept = await seedAdMissing({ createdAt: daysAgo(29) });

    await new AmazonAdMissingCleanupCronService().run();

    expect(await prisma.amazonAdMissing.findMany()).toEqual([kept]);
  });
});
