import { describe, expect, it, vi } from "vitest";
import { createAmazonModule } from "@/modules/marketplaces/amazon";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";
import { AmazonAdPriceCleanupCronService } from "@/modules/marketplaces/amazon/cron/AmazonAdPriceCleanupCronService";

vi.mock("@/modules/marketplaces/amazon/routes/AmazonAdCategoryRouter", () => ({
  AmazonAdCategoryRouter: vi.fn(function () {
    return { path: "/amazon/ads/categories" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/routes/AmazonAdRouter", () => ({
  AmazonAdRouter: vi.fn(function () {
    return { path: "/amazon/ads" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/routes/AmazonAdPriceRouter", () => ({
  AmazonAdPriceRouter: vi.fn(function () {
    return { path: "/amazon/ads/prices" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/routes/AmazonExclusionRuleRouter", () => ({
  AmazonExclusionRuleRouter: vi.fn(function () {
    return { path: "/amazon/exclusion-rules" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/routes/AmazonCountryRouter", () => ({
  AmazonCountryRouter: vi.fn(function () {
    return { path: "/amazon/countries" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/repositories/AmazonAdRepository", () => ({
  AmazonAdRepository: vi.fn(function () {
    return { id: "ad-repository" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection", () => ({
  AmazonAdDailyReportSection: vi.fn(function () {
    return { id: "ad-section" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/cron/AmazonAdPriceCleanupCronService", () => ({
  AmazonAdPriceCleanupCronService: vi.fn(function () {
    return { id: "price-cleanup" };
  }),
}));

describe("createAmazonModule", () => {
  it("mounts the category, ad, price, exclusion rule and country routers in order", () => {
    const module = createAmazonModule();

    expect(module.routers!.map((r) => r.path)).toEqual([
      "/amazon/ads/categories",
      "/amazon/ads",
      "/amazon/ads/prices",
      "/amazon/exclusion-rules",
      "/amazon/countries",
    ]);
  });

  it("schedules the price cleanup", () => {
    const module = createAmazonModule();

    expect(module.crons).toEqual([
      vi.mocked(AmazonAdPriceCleanupCronService).mock.results.at(-1)!.value,
    ]);
  });

  it("matches exclusion rules through the ad repository", () => {
    const module = createAmazonModule();

    expect(module.exclusionRuleTarget).toBe(
      vi.mocked(AmazonAdRepository).mock.results.at(-1)!.value
    );
  });

  it("reports daily stats through the ad section", () => {
    const module = createAmazonModule();

    expect(module.dailyReportSection).toBe(
      vi.mocked(AmazonAdDailyReportSection).mock.results.at(-1)!.value
    );
  });
});
