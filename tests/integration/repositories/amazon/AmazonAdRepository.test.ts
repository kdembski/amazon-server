import { describe, expect, it } from "vitest";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { AmazonAdCreateMapper } from "@/mappers/amazon/AmazonAdCreateMapper";
import { FIXED_DATE } from "../../../support/factories";
import { prisma } from "../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedSearchRule,
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
    it("returns matching ads of any category, never scraped first, then oldest scrapedAt", async () => {
      const inactive = await seedCategory({ active: false });
      const recent = await seedAd({ name: "Sony A", scrapedAt: day(2) });
      const never = await seedAd({ categoryId: inactive.id, name: "Sony B", scrapedAt: null });
      const old = await seedAd({ name: "Sony C", scrapedAt: day(1) });
      await seedAd({ name: "Bose D", scrapedAt: null });
      const searchRule = await seedSearchRule({ value: "sony" });

      const ads = await repository.getForScraping(10, [searchRule]);

      expect(ads).toEqual([
        { id: never.id, asin: never.asin, name: never.name },
        { id: old.id, asin: old.asin, name: old.name },
        { id: recent.id, asin: recent.asin, name: recent.name },
      ]);
    });

    it("limits the result to count", async () => {
      await seedAd({ name: "Sony A" });
      await seedAd({ name: "Sony B" });
      await seedAd({ name: "Sony C" });
      const searchRule = await seedSearchRule({ value: "Sony" });

      expect(await repository.getForScraping(2, [searchRule])).toHaveLength(2);
    });

    it("returns ads matching any of the search rules, case-insensitively on MySQL", async () => {
      const sony = await seedAd({ name: "Sony WH-1000XM5" });
      const bose = await seedAd({ name: "Bose QC45" });
      await seedAd({ name: "JBL Tune 760" });
      const searchRules = [
        await seedSearchRule({ value: "SONY" }),
        await seedSearchRule({ value: "bose" }),
      ];

      const ads = await repository.getForScraping(10, searchRules);

      expect(ads.map((ad) => ad.id).sort((a, b) => a - b)).toEqual(
        [sony.id, bose.id].sort((a, b) => a - b)
      );
    });

    it("requires every part of a search rule joined with +", async () => {
      await seedAd({ name: "RTX 4080 Super" });
      const both = await seedAd({ name: "RTX 4090 Founders" });
      const searchRule = await seedSearchRule({ value: "rtx+4090" });

      const ads = await repository.getForScraping(10, [searchRule]);

      expect(ads.map((ad) => ad.id)).toEqual([both.id]);
    });

    it("supports alternatives, exclusions and phrases with spaces", async () => {
      const desktop = await seedAd({ name: "RTX 4090 Founders Edition" });
      const other = await seedAd({ name: "RTX 4080 Super Open Box" });
      await seedAd({ name: "RTX 4090 Laptop GPU" });
      await seedAd({ name: "RTX 4070 Ti" });
      const openBox = await seedAd({ name: "Sony Open Box headphones" });
      await seedAd({ name: "Sony headphones open-box" });
      const rules = [
        await seedSearchRule({ value: "rtx+4090|4080+!laptop" }),
        await seedSearchRule({ value: "sony+open box" }),
      ];

      const ads = await repository.getForScraping(10, rules);

      expect(ads.map((ad) => ad.id).sort((a, b) => a - b)).toEqual(
        [desktop.id, other.id, openBox.id].sort((a, b) => a - b)
      );
    });

    it("applies exclusion-only rules to every other rule", async () => {
      const fresh = await seedAd({ name: "Sony WH-1000XM5" });
      await seedAd({ name: "Sony WH-1000XM5 (Refurbished)" });
      await seedAd({ name: "Used Bose QC45" });
      const rules = [
        await seedSearchRule({ value: "sony" }),
        await seedSearchRule({ value: "bose" }),
        await seedSearchRule({ value: "!refurbished|used" }),
      ];

      const ads = await repository.getForScraping(10, rules);

      expect(ads.map((ad) => ad.id)).toEqual([fresh.id]);
    });

    it("returns nothing when only exclusion rules exist", async () => {
      await seedAd({ name: "Sony WH-1000XM5" });
      const rule = await seedSearchRule({ value: "!used" });

      expect(await repository.getForScraping(10, [rule])).toEqual([]);
    });

    it("treats % and _ in rules literally", async () => {
      const percent = await seedAd({ name: "Save 50% today" });
      const underscore = await seedAd({ name: "cable_usb" });
      await seedAd({ name: "Save 50 today" });
      await seedAd({ name: "cable-usb" });
      const rules = [
        await seedSearchRule({ value: "50%" }),
        await seedSearchRule({ value: "cable_usb" }),
      ];

      const ads = await repository.getForScraping(10, rules);

      expect(ads.map((ad) => ad.id).sort((a, b) => a - b)).toEqual(
        [percent.id, underscore.id].sort((a, b) => a - b)
      );
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
