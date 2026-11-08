import { describe, expect, it } from "vitest";
import { AmazonExclusionRuleTarget } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleTarget";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";
import { prisma } from "../../../../../support/integration/db";
import { seedAd, seedCategory } from "../../../../../support/integration/seed";

const repository = new AmazonExclusionRuleTarget(new AmazonAdRepository(prisma));
const parser = new ExclusionRuleParser();
const rules = (...values: string[]) => {
  const matcher = new ExclusionRuleMatcher(values.map((value) => parser.parse(value)));
  return (name: string) => matcher.excludes(name);
};

describe("AmazonExclusionRuleTarget (MySQL)", () => {
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

      expect(result).toEqual({ excluded: 2, included: 1, scanned: 3 });
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

      expect(await repository.matchExclusionRules(excludes)).toEqual({ excluded: 0, included: 2, scanned: 2 });
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

      expect(await repository.matchExclusionRules(excludes)).toEqual({ excluded: 1, included: 1, scanned: 2 });
      expect(await flags()).toEqual([
        ["Sony WH-1000XM5", false],
        ["Bose QC45", true],
      ]);
    });

    it("rematches across several id batches", async () => {
      const batched = new AmazonExclusionRuleTarget(new AmazonAdRepository(prisma), undefined, undefined, 2);
      await seedAd({ name: "Sony 1", excluded: false });
      await seedAd({ name: "Bose 2", excluded: true });
      await seedAd({ name: "Sony 3", excluded: null });
      await seedAd({ name: "Bose 4", excluded: null });
      await seedAd({ name: "Sony 5", excluded: true });
      const excludes = rules("sony");

      expect(await batched.matchExclusionRules(excludes)).toEqual({ excluded: 2, included: 2, scanned: 5 });
      expect(await flags()).toEqual([
        ["Sony 1", true],
        ["Bose 2", false],
        ["Sony 3", true],
        ["Bose 4", false],
        ["Sony 5", true],
      ]);
    });

    it("with scope ids rematches only the ads of these categories", async () => {
      const batched = new AmazonExclusionRuleTarget(new AmazonAdRepository(prisma), undefined, undefined, 2);
      const audio = await seedCategory();
      const tools = await seedCategory();
      await seedAd({ name: "Sony 1", categoryId: audio.id, excluded: false });
      await seedAd({ name: "Sony 2", categoryId: tools.id, excluded: false });
      await seedAd({ name: "Bose 3", categoryId: audio.id, excluded: true });
      await seedAd({ name: "Bose 4", categoryId: tools.id, excluded: true });
      const excludes = rules("sony");

      expect(await batched.matchExclusionRules(excludes, [audio.id])).toEqual({
        excluded: 1,
        included: 1,
        scanned: 2,
      });
      expect(await flags()).toEqual([
        ["Sony 1", true],
        ["Sony 2", false],
        ["Bose 3", false],
        ["Bose 4", true],
      ]);
    });

    it("with only = \"new\" checks only ads that were never checked", async () => {
      await seedAd({ name: "Sony stale true", excluded: true });
      await seedAd({ name: "Bose stale false", excluded: false });
      await seedAd({ name: "Bose new", excluded: null });
      await seedAd({ name: "Sony new", excluded: null });
      const excludes = rules("bose");

      expect(await repository.matchExclusionRules(excludes, "new")).toEqual({ excluded: 1, included: 1, scanned: 2 });
      expect(await flags()).toEqual([
        ["Sony stale true", true],
        ["Bose stale false", false],
        ["Bose new", true],
        ["Sony new", false],
      ]);
    });
  });
});
