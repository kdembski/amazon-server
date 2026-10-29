import { describe, expect, it, vi } from "vitest";
import { ExclusionRuleMatchService } from "@/modules/exclusion-rules/services/ExclusionRuleMatchService";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdService } from "@/modules/marketplaces/amazon/services/AmazonAdService";
import { prisma } from "../../../../support/integration/db";
import { seedAd, seedAmazonExclusionRule, seedCategory } from "../../../../support/integration/seed";

const flags = async () => {
  const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => [row.name, row.excluded]);
};

describe("ExclusionRuleMatchService (MySQL)", () => {
  it("excludes ads on the first run, then picks up new ads and rule changes made anywhere", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new ExclusionRuleMatchService([new AmazonAdRepository()]);
    await seedAd({ name: "Sony WH-1000XM5" });
    await seedAd({ name: "Bose QC45" });
    await seedAmazonExclusionRule({ value: "sony" });

    await service.sync();
    expect(await flags()).toEqual([
      ["Sony WH-1000XM5", true],
      ["Bose QC45", false],
    ]);

    await seedAd({ name: "Sony A7 IV" });
    await service.sync();
    expect((await flags())[2]).toEqual(["Sony A7 IV", true]);

    // A rule inserted straight into the table, bypassing Discord.
    await prisma.amazonExclusionRule.create({ data: { value: "bose", inverted: false, createdAt: new Date() } });
    await service.sync();
    expect(await flags()).toEqual([
      ["Sony WH-1000XM5", true],
      ["Bose QC45", true],
      ["Sony A7 IV", true],
    ]);
  });

  it("feeds GET /scrap through AmazonAdService once the ads are checked", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    await seedAd({ name: "Sony WH-1000XM5" });
    const bose = await seedAd({ name: "Bose QC45" });
    await seedAmazonExclusionRule({ value: "sony" });
    const adService = new AmazonAdService();

    expect(await adService.getForScraping(10)).toEqual([]);
    await new ExclusionRuleMatchService([new AmazonAdRepository()]).sync();

    expect((await adService.getForScraping(10)).map((ad) => ad.id)).toEqual([bose.id]);
  });

  it("excludes ads of an inactive category until it is activated", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new ExclusionRuleMatchService([new AmazonAdRepository()]);
    const inactive = await seedCategory({ active: false });
    await seedAd({ name: "Sony A7" });
    await seedAd({ name: "Sony A7 II", categoryId: inactive.id });

    await service.sync();
    expect(await flags()).toEqual([
      ["Sony A7", false],
      ["Sony A7 II", true],
    ]);

    await prisma.amazonAdCategory.update({ where: { id: inactive.id }, data: { active: true } });
    await service.sync();
    expect(await flags()).toEqual([
      ["Sony A7", false],
      ["Sony A7 II", false],
    ]);
  });

  it("applies a category rule only to ads of that category", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const a = await seedCategory();
    const b = await seedCategory();
    await seedAd({ name: "Sony A7", categoryId: a.id });
    await seedAd({ name: "Sony A7 II", categoryId: b.id });
    await seedAmazonExclusionRule({ value: "sony", categoryId: a.id });

    await new ExclusionRuleMatchService([new AmazonAdRepository()]).sync();

    expect(await flags()).toEqual([
      ["Sony A7", true],
      ["Sony A7 II", false],
    ]);
  });
});
