import { describe, expect, it } from "vitest";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { AmazonAdCreateMapper } from "@/mappers/amazon/AmazonAdCreateMapper";
import { FIXED_DATE } from "../../../support/factories";
import { prisma } from "../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedKeyword,
  seedPrice,
} from "../../../support/integration/seed";

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
    it("returns ads of the given categories, never scraped first, then oldest scrapedAt", async () => {
      const wanted = await seedCategory();
      const other = await seedCategory();
      const recent = await seedAd({ categoryId: wanted.id, scrapedAt: day(2) });
      const never = await seedAd({ categoryId: wanted.id, scrapedAt: null });
      const old = await seedAd({ categoryId: wanted.id, scrapedAt: day(1) });
      await seedAd({ categoryId: other.id, scrapedAt: null });

      const ads = await repository.getForScraping(10, [wanted.id], []);

      expect(ads).toEqual([
        { id: never.id, asin: never.asin, name: never.name },
        { id: old.id, asin: old.asin, name: old.name },
        { id: recent.id, asin: recent.asin, name: recent.name },
      ]);
    });

    it("limits the result to count", async () => {
      const category = await seedCategory();
      await seedAd({ categoryId: category.id });
      await seedAd({ categoryId: category.id });
      await seedAd({ categoryId: category.id });

      expect(await repository.getForScraping(2, [category.id], [])).toHaveLength(2);
    });

    it("returns nothing for an empty category list", async () => {
      await seedAd();

      expect(await repository.getForScraping(10, [], [])).toEqual([]);
    });

    it("excludes names containing a blacklisted keyword, case-insensitively on MySQL", async () => {
      const category = await seedCategory();
      const clean = await seedAd({ categoryId: category.id, name: "Sony WH-1000XM5" });
      await seedAd({ categoryId: category.id, name: "Refurbished Sony WH-1000XM5" });
      const keyword = await seedKeyword({ value: "refurbished" });

      const ads = await repository.getForScraping(10, [category.id], [keyword]);

      expect(ads.map((ad) => ad.id)).toEqual([clean.id]);
    });

    it("requires every part of a keyword joined with +", async () => {
      const category = await seedCategory();
      const boxOnly = await seedAd({ categoryId: category.id, name: "Open box Sony" });
      await seedAd({ categoryId: category.id, name: "Open box damaged Sony" });
      const keyword = await seedKeyword({ value: "box+damaged" });

      const ads = await repository.getForScraping(10, [category.id], [keyword]);

      expect(ads.map((ad) => ad.id)).toEqual([boxOnly.id]);
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

  it("getCount honours inclusive from/to bounds", async () => {
    await seedAd({ createdAt: day(0) });
    await seedAd({ createdAt: day(1) });
    await seedAd({ createdAt: day(2) });

    expect(await repository.getCount()).toBe(3);
    expect(await repository.getCount(day(1), day(2))).toBe(2);
    expect(await repository.getCount(undefined, day(0))).toBe(1);
  });

  it("getBlacklistedCount counts ads matching any keyword", async () => {
    await seedAd({ name: "Used phone" });
    await seedAd({ name: "Broken screen phone" });
    await seedAd({ name: "New phone" });
    const used = await seedKeyword({ value: "used" });
    const broken = await seedKeyword({ value: "broken" });

    expect(await repository.getBlacklistedCount([used, broken])).toBe(2);
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
