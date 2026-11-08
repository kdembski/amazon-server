import { describe, expect, it } from "vitest";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { FIXED_DATE } from "../../../../../support/factories";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedPrice,
} from "../../../../../support/integration/seed";

const repository = new AmazonAdRepository(prisma);
const day = (n: number) => new Date(FIXED_DATE.getTime() + n * 86_400_000);

describe("AmazonAdRepository (MySQL)", () => {
  it("getById returns the ad with its category summary", async () => {
    const category = await seedCategory({ name: "audio", active: true });
    const ad = await seedAd({ categoryId: category.id });

    const result = await repository.getById(ad.id);

    expect(result).toEqual({
      id: ad.id,
      asin: ad.asin,
      image: ad.image,
      name: ad.name,
      categoryId: category.id,
      createdAt: FIXED_DATE,
      updatedAt: FIXED_DATE,
      scrapedAt: null,
      category: { id: category.id, name: "audio", active: true },
    });
  });

  it("getById throws P2025 for a missing id", async () => {
    await expect(repository.getById(999)).rejects.toMatchObject({
      code: "P2025",
    });
  });

  describe("getForScraping", () => {
    it("returns ads that are not excluded, of any category, never scraped first, then oldest scrapedAt", async () => {
      const inactive = await seedCategory({ active: false });
      const recent = await seedAd({ excluded: false, scrapedAt: day(2) });
      const never = await seedAd({ categoryId: inactive.id, excluded: false, scrapedAt: null });
      const old = await seedAd({ excluded: false, scrapedAt: day(1) });
      await seedAd({ excluded: true, scrapedAt: null });
      await seedAd({ excluded: null, scrapedAt: null });

      const ads = await repository.getForScraping(10);

      expect(ads).toEqual([
        { id: never.id, asin: never.asin, name: never.name },
        { id: old.id, asin: old.asin, name: old.name },
        { id: recent.id, asin: recent.asin, name: recent.name },
      ]);
    });

    it("limits the result to count", async () => {
      await seedAd({ excluded: false });
      await seedAd({ excluded: false });
      await seedAd({ excluded: false });

      expect(await repository.getForScraping(2)).toHaveLength(2);
    });

    it("reads the excluded, scrapedAt index without a filesort", async () => {
      await seedAd({ excluded: false });

      // Prisma names the EXPLAIN columns f0..f11: f6 is `key`, f11 is `Extra`.
      const [plan] = await prisma.$queryRawUnsafe<{ f6: string; f11: string | null }[]>(
        "EXPLAIN SELECT id, asin, name FROM AmazonAd WHERE excluded = false ORDER BY scrapedAt ASC LIMIT 50"
      );

      expect(plan.f6).toBe("amazon_ad_excluded_scraped_at_idx");
      expect(plan.f11 ?? "").not.toContain("filesort");
    });
  });

  it("updateScrapedAt stamps only the given ids", async () => {
    const a = await seedAd();
    const b = await seedAd();
    const untouched = await seedAd();

    const affected = await repository.updateScrapedAt([a.id, b.id]);

    expect(affected).toBe(2);
    const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
    expect(rows.map((row) => [row.id, row.scrapedAt instanceof Date])).toEqual([
      [a.id, true],
      [b.id, true],
      [untouched.id, false],
    ]);
  });

  it("updateScrapedAt accepts an empty id list", async () => {
    await expect(repository.updateScrapedAt([])).resolves.toBe(0);
  });

  it("getCount honours inclusive from/to bounds", async () => {
    await seedAd({ createdAt: day(0) });
    await seedAd({ createdAt: day(1) });
    await seedAd({ createdAt: day(2) });

    expect(await repository.getCount()).toBe(3);
    expect(await repository.getCount(day(1), day(2))).toBe(2);
    expect(await repository.getCount(undefined, day(0))).toBe(1);
  });

  it("create connects an existing category by name or creates it", async () => {
    const existing = await seedCategory({ name: "electronics" });
    const mapper = new AmazonAdCreateMapper();

    const reused = await repository.create(
      mapper.toCreateInput({ asin: "A1", name: "Ad", image: "img", categoryName: "electronics" })
    );
    const fresh = await repository.create(
      mapper.toCreateInput({ asin: "A2", name: "Ad", image: "img", categoryName: "toys" })
    );

    expect(reused.categoryId).toBe(existing.id);
    expect(fresh.categoryId).not.toBe(existing.id);
    expect(await prisma.amazonAdCategory.count()).toBe(2);
  });

  it("asin is unique", async () => {
    await seedAd({ asin: "B0DUPLICATE" });

    await expect(seedAd({ asin: "B0DUPLICATE" })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("delete cascades to prices", async () => {
    const ad = await seedAd();
    await seedPrice({ adId: ad.id });

    await repository.delete(ad.id);

    expect(await prisma.amazonAdPrice.count()).toBe(0);
  });
});
