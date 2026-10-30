import { describe, expect, it, vi } from "vitest";
import { AmazonAdPriceCleanupCronService } from "@/modules/marketplaces/amazon/cron/AmazonAdPriceCleanupCronService";
import { prisma } from "../../../../../support/integration/db";
import { seedPrice } from "../../../../../support/integration/seed";

const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60_000);

describe("AmazonAdPriceCleanupCronService (MySQL)", () => {
  it("removes only prices created more than 90 days ago", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedPrice({ createdAt: daysAgo(91) });
    await seedPrice({ createdAt: daysAgo(120) });
    const kept = await seedPrice({ createdAt: daysAgo(89) });

    await new AmazonAdPriceCleanupCronService().run();

    expect(
      (await prisma.amazonAdPrice.findMany()).map((row) => row.id)
    ).toEqual([kept.id]);
  });
});
