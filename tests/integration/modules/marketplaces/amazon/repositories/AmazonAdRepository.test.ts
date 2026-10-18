import { describe, expect, it } from "vitest";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { FIXED_DATE } from "../../../../../support/factories";
import {
  createSearchRuleMatcher,
  parseSearchRule,
} from "@/modules/search-rules/helpers/searchRule";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedPrice,
} from "../../../../../support/integration/seed";

const repository = new AmazonAdRepository(prisma);
const rules = (...values: string[]) =>
  createSearchRuleMatcher(values.map(parseSearchRule));
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
      const recent = await seedAd({ matchesRules: true, scrapedAt: day(2) });
      const never = await seedAd({ categoryId: inactive.id, matchesRules: true, scrapedAt: null });
      const old = await seedAd({ matchesRules: true, scrapedAt: day(1) });
      await seedAd({ matchesRules: false, scrapedAt: null });
      await seedAd({ matchesRules: null, scrapedAt: null });

      const ads = await repository.getForScraping(10);

      expect(ads).toEqual([
        { id: never.id, asin: never.asin, name: never.name },
        { id: old.id, asin: old.asin, name: old.name },
        { id: recent.id, asin: recent.asin, name: recent.name },
      ]);
    });

    it("limits the result to count", async () => {
      await seedAd({ matchesRules: true });
      await seedAd({ matchesRules: true });
      await seedAd({ matchesRules: true });

      expect(await repository.getForScraping(2)).toHaveLength(2);
    });

    it("reads the matchesRules, scrapedAt index without a filesort", async () => {
      await seedAd({ matchesRules: true });

      // Prisma names the EXPLAIN columns f0..f11: f6 is `key`, f11 is `Extra`.
      const [plan] = await prisma.$queryRawUnsafe<{ f6: string; f11: string | null }[]>(
        "EXPLAIN SELECT id, asin, name FROM AmazonAd WHERE matchesRules = true ORDER BY scrapedAt ASC LIMIT 50"
      );

      expect(plan.f6).toBe("amazon_ad_matches_rules_scraped_at_idx");
      expect(plan.f11 ?? "").not.toContain("filesort");
    });
  });

  describe("matchSearchRules", () => {
    const flags = async () => {
      const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
      return rows.map((row) => [row.name, row.matchesRules]);
    };

    it("flags ads matching any rule, case-insensitively, and counts the changes", async () => {
      await seedAd({ name: "Sony WH-1000XM5" });
      await seedAd({ name: "Bose QC45" });
      await seedAd({ name: "JBL Tune 760" });
      const matches = rules("SONY", "bose");

      const result = await repository.matchSearchRules(matches);

      expect(result).toEqual({ matched: 2, unmatched: 1 });
      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", true],
        ["Bose QC45", true],
        ["JBL Tune 760", false],
      ]);
    });

    it("requires every part joined with +, supports alternatives, exclusions and phrases", async () => {
      await seedAd({ name: "RTX 4090 Founders Edition" });
      await seedAd({ name: "RTX 4080 Super Open Box" });
      await seedAd({ name: "RTX 4090 Laptop GPU" });
      await seedAd({ name: "RTX 4070 Ti" });
      await seedAd({ name: "Sony Open Box headphones" });
      await seedAd({ name: "Sony headphones open-box" });
      const matches = rules("rtx+4090|4080+!laptop", "sony+open box");

      await repository.matchSearchRules(matches);

      expect(await flags()).toEqual([
        ["RTX 4090 Founders Edition", true],
        ["RTX 4080 Super Open Box", true],
        ["RTX 4090 Laptop GPU", false],
        ["RTX 4070 Ti", false],
        ["Sony Open Box headphones", true],
        ["Sony headphones open-box", false],
      ]);
    });

    it("applies exclusion-only rules to every other rule", async () => {
      await seedAd({ name: "Sony WH-1000XM5" });
      await seedAd({ name: "Sony WH-1000XM5 (Refurbished)" });
      await seedAd({ name: "Used Bose QC45" });
      const matches = rules("sony", "bose", "!refurbished|used");

      await repository.matchSearchRules(matches);

      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", true],
        ["Sony WH-1000XM5 (Refurbished)", false],
        ["Used Bose QC45", false],
      ]);
    });

    it("clears every ad when no rule has a positive member", async () => {
      await seedAd({ name: "Sony WH-1000XM5", matchesRules: true });
      await seedAd({ name: "Bose QC45", matchesRules: null });
      const matches = rules("!used");

      expect(await repository.matchSearchRules(matches)).toEqual({ matched: 0, unmatched: 2 });
      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", false],
        ["Bose QC45", false],
      ]);
    });

    it("matches whole words unless a phrase has a wildcard", async () => {
      await seedAd({ name: "Hape drewniana kuchnia" });
      await seedAd({ name: "Mini Gift Bag Shaped Balloon, torebka" });
      await seedAd({ name: "Hape kuchnia" });
      await seedAd({ name: "Zdalnie sterowana łódź" });
      const matches = rules("hape+drewn*", "*sterowan*+lodz");

      await repository.matchSearchRules(matches);

      expect(await flags()).toEqual([
        ["Hape drewniana kuchnia", true],
        ["Mini Gift Bag Shaped Balloon, torebka", false],
        ["Hape kuchnia", false],
        ["Zdalnie sterowana łódź", true],
      ]);
    });

    it("treats % and _ in rules literally", async () => {
      await seedAd({ name: "Save 50% today" });
      await seedAd({ name: "cable_usb" });
      await seedAd({ name: "Save 50 today" });
      await seedAd({ name: "cable-usb" });
      const matches = rules("50%", "cable_usb");

      await repository.matchSearchRules(matches);

      expect(await flags()).toEqual([
        ["Save 50% today", true],
        ["cable_usb", true],
        ["Save 50 today", false],
        ["cable-usb", false],
      ]);
    });

    it("rematches previously flagged ads when the rules change", async () => {
      await seedAd({ name: "Sony WH-1000XM5", matchesRules: true });
      await seedAd({ name: "Bose QC45", matchesRules: false });
      const matches = rules("bose");

      expect(await repository.matchSearchRules(matches)).toEqual({ matched: 1, unmatched: 1 });
      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", false],
        ["Bose QC45", true],
      ]);
    });

    it("rematches across several id batches", async () => {
      const batched = new AmazonAdRepository(prisma, 2);
      await seedAd({ name: "Sony 1", matchesRules: false });
      await seedAd({ name: "Bose 2", matchesRules: true });
      await seedAd({ name: "Sony 3", matchesRules: null });
      await seedAd({ name: "Bose 4", matchesRules: null });
      await seedAd({ name: "Sony 5", matchesRules: true });
      const matches = rules("sony");

      expect(await batched.matchSearchRules(matches)).toEqual({ matched: 2, unmatched: 2 });
      expect(await flags()).toEqual([
        ["Sony 1", true],
        ["Bose 2", false],
        ["Sony 3", true],
        ["Bose 4", false],
        ["Sony 5", true],
      ]);
    });

    it("with onlyNew checks only ads that were never matched", async () => {
      await seedAd({ name: "Sony stale true", matchesRules: true });
      await seedAd({ name: "Bose stale false", matchesRules: false });
      await seedAd({ name: "Bose new", matchesRules: null });
      await seedAd({ name: "Sony new", matchesRules: null });
      const matches = rules("bose");

      expect(await repository.matchSearchRules(matches, true)).toEqual({ matched: 1, unmatched: 1 });
      expect(await flags()).toEqual([
        ["Sony stale true", true],
        ["Bose stale false", false],
        ["Bose new", true],
        ["Sony new", false],
      ]);
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
