import { describe, expect, it } from "vitest";
import { AmazonAdScrapingService } from "@/modules/marketplaces/amazon/services/AmazonAdScrapingService";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedCategory } from "../../../../../support/integration/seed";

describe("AmazonAdScrapingService (MySQL)", () => {
  it("returns ads that are not excluded from any category and stamps only them", async () => {
    const service = new AmazonAdScrapingService();
    const inactive = await seedCategory({ active: false });
    const wanted = await seedAd({ categoryId: inactive.id, excluded: false });
    const other = await seedAd({ excluded: true });
    const unchecked = await seedAd({ excluded: null });

    const ads = await service.getForScraping(10);

    expect(ads).toEqual([
      { id: wanted.id, asin: wanted.asin, name: wanted.name, skipRouteIds: [] },
    ]);
    const rows = await prisma.amazonAd.findMany({
      where: { id: { in: [wanted.id, other.id, unchecked.id] } },
      orderBy: { id: "asc" },
    });
    expect(rows.map((row) => row.scrapedAt instanceof Date)).toEqual([true, false, false]);
  });

  it("hands out the same ads again once every included ad was stamped", async () => {
    const service = new AmazonAdScrapingService();
    const first = await seedAd({ excluded: false });
    const second = await seedAd({ excluded: false });

    const round1 = await service.getForScraping(1);
    await prisma.amazonAd.update({ where: { id: round1[0].id }, data: { scrapedAt: new Date(FIXED_DATE.getTime() + 1000) } });
    const round2 = await service.getForScraping(1);
    await prisma.amazonAd.update({ where: { id: round2[0].id }, data: { scrapedAt: new Date(FIXED_DATE.getTime() + 2000) } });
    const round3 = await service.getForScraping(1);

    expect([round1[0].id, round2[0].id].sort((x, y) => x - y)).toEqual(
      [first.id, second.id].sort((x, y) => x - y)
    );
    expect(round3[0].id).toBe(round1[0].id);
  });

  it("serialises concurrent calls so they hand out disjoint ads", async () => {
    const service = new AmazonAdScrapingService();
    const first = await seedAd({ excluded: false });
    const second = await seedAd({ excluded: false });

    const [a, b] = await Promise.all([
      service.getForScraping(1),
      service.getForScraping(1),
    ]);

    expect([a[0].id, b[0].id].sort((x, y) => x - y)).toEqual(
      [first.id, second.id].sort((x, y) => x - y)
    );
  });
});
