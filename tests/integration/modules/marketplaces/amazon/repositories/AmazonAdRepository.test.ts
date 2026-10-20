import { describe, expect, it } from "vitest";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdCreateMapper } from "@/modules/marketplaces/amazon/mappers/AmazonAdCreateMapper";
import { FIXED_DATE } from "../../../../../support/factories";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";
import { prisma } from "../../../../../support/integration/db";
import {
  seedAd,
  seedCategory,
  seedPrice,
} from "../../../../../support/integration/seed";

const repository = new AmazonAdRepository(prisma);
const parser = new ExclusionRuleParser();
const rules = (...values: string[]) => {
  const matcher = new ExclusionRuleMatcher(values.map((value) => parser.parse(value)));
  return (name: string) => matcher.excludes(name);
};
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

  describe("matchExclusionRules", () => {
    const flags = async () => {
      const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
      return rows.map((row) => [row.name, row.excluded]);
    };

    it("excludes ads matching any rule, case-insensitively, and counts the changes", async () => {
      await seedAd({ name: "Sony WH-1000XM5" });
      await seedAd({ name: "Bose QC45" });
      await seedAd({ name: "JBL Tune 760" });
      const excludes = rules("SONY", "bose");

      const result = await repository.matchExclusionRules(excludes);

      expect(result).toEqual({ excluded: 2, included: 1 });
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
      const excludes = rules("rtx+4090|4080+!laptop", "sony+open box");

      await repository.matchExclusionRules(excludes);

      expect(await flags()).toEqual([
        ["RTX 4090 Founders Edition", true],
        ["RTX 4080 Super Open Box", true],
        ["RTX 4090 Laptop GPU", false],
        ["RTX 4070 Ti", false],
        ["Sony Open Box headphones", true],
        ["Sony headphones open-box", false],
      ]);
    });

    it("keeps an ad matching a ! exception", async () => {
      await seedAd({ name: "Etui Samsung S24" });
      await seedAd({ name: "Etui iPhone 16 Pro" });
      const excludes = rules("etui + !iphone 16");

      await repository.matchExclusionRules(excludes);

      expect(await flags()).toEqual([
        ["Etui Samsung S24", true],
        ["Etui iPhone 16 Pro", false],
      ]);
    });

    it("includes every ad when there are no rules", async () => {
      await seedAd({ name: "Sony WH-1000XM5", excluded: true });
      await seedAd({ name: "Bose QC45", excluded: null });
      const excludes = rules();

      expect(await repository.matchExclusionRules(excludes)).toEqual({ excluded: 0, included: 2 });
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
      const excludes = rules("hape+drewn*", "*sterowan*+lodz");

      await repository.matchExclusionRules(excludes);

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
      const excludes = rules("50%", "cable_usb");

      await repository.matchExclusionRules(excludes);

      expect(await flags()).toEqual([
        ["Save 50% today", true],
        ["cable_usb", true],
        ["Save 50 today", false],
        ["cable-usb", false],
      ]);
    });

    it("rematches previously checked ads when the rules change", async () => {
      await seedAd({ name: "Sony WH-1000XM5", excluded: true });
      await seedAd({ name: "Bose QC45", excluded: false });
      const excludes = rules("bose");

      expect(await repository.matchExclusionRules(excludes)).toEqual({ excluded: 1, included: 1 });
      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", false],
        ["Bose QC45", true],
      ]);
    });

    it("rematches across several id batches", async () => {
      const batched = new AmazonAdRepository(prisma, 2);
      await seedAd({ name: "Sony 1", excluded: false });
      await seedAd({ name: "Bose 2", excluded: true });
      await seedAd({ name: "Sony 3", excluded: null });
      await seedAd({ name: "Bose 4", excluded: null });
      await seedAd({ name: "Sony 5", excluded: true });
      const excludes = rules("sony");

      expect(await batched.matchExclusionRules(excludes)).toEqual({ excluded: 2, included: 2 });
      expect(await flags()).toEqual([
        ["Sony 1", true],
        ["Bose 2", false],
        ["Sony 3", true],
        ["Bose 4", false],
        ["Sony 5", true],
      ]);
    });

    it("with onlyNew checks only ads that were never checked", async () => {
      await seedAd({ name: "Sony stale true", excluded: true });
      await seedAd({ name: "Bose stale false", excluded: false });
      await seedAd({ name: "Bose new", excluded: null });
      await seedAd({ name: "Sony new", excluded: null });
      const excludes = rules("bose");

      expect(await repository.matchExclusionRules(excludes, true)).toEqual({ excluded: 1, included: 1 });
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
