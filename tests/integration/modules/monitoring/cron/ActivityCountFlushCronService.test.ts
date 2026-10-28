import { describe, expect, it } from "vitest";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { prisma } from "../../../../support/integration/db";

describe("ActivityCountFlushCronService (MySQL)", () => {
  it("stores the counted events once and they show up in the count", async () => {
    const counts = new ActivityCountService();
    counts.increment("ad_scraped", "amazon", [1, 2, 3, 4]);
    counts.increment("ad_scraped", "amazon", [1, 2]);

    await new ActivityCountFlushCronService().run();
    await new ActivityCountFlushCronService().run();

    expect(await prisma.activityEvent.findMany()).toMatchObject([
      { type: "ad_scraped", marketplace: "amazon", data: { count: 2, prices: { 2: 1, 4: 1 }, countries: { 1: 2, 2: 2, 3: 1, 4: 1 } } },
    ]);
    expect(await counts.getCount("ad_scraped", new Date(0), new Date())).toBe(2);
    expect(await counts.getCountWithMinPrices("ad_scraped", 4, new Date(0), new Date())).toBe(1);
  });
});
