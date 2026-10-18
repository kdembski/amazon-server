import { describe, expect, it, vi } from "vitest";
import { SearchRuleMatchService } from "@/modules/search-rules/services/SearchRuleMatchService";
import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { prisma } from "../../../../support/integration/db";
import { seedAd, seedSearchRule } from "../../../../support/integration/seed";

const flags = async () => {
  const rows = await prisma.amazonAd.findMany({ orderBy: { id: "asc" } });
  return rows.map((row) => [row.name, row.matchesRules]);
};

describe("SearchRuleMatchService (MySQL)", () => {
  it("flags ads on the first run, then picks up new ads and rule changes made anywhere", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const service = new SearchRuleMatchService([new AmazonAdRepository()]);
    await seedAd({ name: "Sony WH-1000XM5" });
    await seedAd({ name: "Bose QC45" });
    await seedSearchRule({ value: "sony" });

    await service.sync();
    expect(await flags()).toEqual([
      ["Sony WH-1000XM5", true],
      ["Bose QC45", false],
    ]);

    await seedAd({ name: "Sony A7 IV" });
    await service.sync();
    expect((await flags())[2]).toEqual(["Sony A7 IV", true]);

    // A rule inserted straight into the table, bypassing Discord.
    await prisma.searchRule.create({ data: { value: "bose", createdAt: new Date() } });
    await service.sync();
    expect(await flags()).toEqual([
      ["Sony WH-1000XM5", true],
      ["Bose QC45", true],
      ["Sony A7 IV", true],
    ]);
  });

  it("feeds GET /scrap through AmazonAdService once the ads are matched", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const sony = await seedAd({ name: "Sony WH-1000XM5" });
    await seedAd({ name: "Bose QC45" });
    await seedSearchRule({ value: "sony" });
    const adService = new AmazonAdService();

    expect(await adService.getForScraping(10)).toEqual([]);
    await new SearchRuleMatchService([new AmazonAdRepository()]).sync();

    expect((await adService.getForScraping(10)).map((ad) => ad.id)).toEqual([sony.id]);
  });
});
