import { describe, expect, it, vi } from "vitest";
import { createAmazonModule } from "@/modules/marketplaces/amazon";
import { AmazonExclusionRuleTarget } from "@/modules/marketplaces/amazon/services/AmazonExclusionRuleTarget";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";

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
vi.mock("@/modules/marketplaces/amazon/routes/AmazonCountryRouteRouter", () => ({
  AmazonCountryRouteRouter: vi.fn(function () {
    return { path: "/amazon/countries/routes" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/routes/AmazonCountryRouter", () => ({
  AmazonCountryRouter: vi.fn(function () {
    return { path: "/amazon/countries" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/services/AmazonExclusionRuleTarget", () => ({
  AmazonExclusionRuleTarget: vi.fn(function () {
    return { id: "exclusion-rule-target" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection", () => ({
  AmazonAdDailyReportSection: vi.fn(function () {
    return { id: "ad-section" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/services/AmazonAdPriceService", () => ({
  AmazonAdPriceService: vi.fn(function () {
    return { id: "price-service" };
  }),
}));
vi.mock("@/modules/marketplaces/amazon/services/AmazonAdMissingService", () => ({
  AmazonAdMissingService: vi.fn(function () {
    return { id: "missing-service" };
  }),
}));

describe("createAmazonModule", () => {
  it("mounts the category, ad, price, exclusion rule, country route and country routers in order", () => {
    const module = createAmazonModule();

    expect(module.routers!.map((r) => r.path)).toEqual([
      "/amazon/ads/categories",
      "/amazon/ads",
      "/amazon/ads/prices",
      "/amazon/exclusion-rules",
      "/amazon/countries/routes",
      "/amazon/countries",
    ]);
  });

  it("schedules the price and missing route cleanups", () => {
    const module = createAmazonModule();

    const crons = module.workerCrons as RetentionCleanupCronService[];
    expect(crons.every((c) => c instanceof RetentionCleanupCronService)).toBe(true);
    expect(crons.map((c) => [c["cronTime"], c["label"], c["retentionDays"], c["target"]])).toEqual([
      ["00 00 04 * * *", "Amazon ad prices", 90, vi.mocked(AmazonAdPriceService).mock.results.at(-1)!.value],
      [
        "00 30 04 * * *",
        "Amazon ad missing routes",
        30,
        vi.mocked(AmazonAdMissingService).mock.results.at(-1)!.value,
      ],
    ]);
  });

  it("matches exclusion rules through the Amazon exclusion rule target", () => {
    const module = createAmazonModule();

    expect(module.exclusionRuleTarget).toBe(
      vi.mocked(AmazonExclusionRuleTarget).mock.results.at(-1)!.value
    );
  });

  it("reports daily stats through the ad section", () => {
    const module = createAmazonModule();

    expect(module.dailyReportSection).toBe(
      vi.mocked(AmazonAdDailyReportSection).mock.results.at(-1)!.value
    );
  });
});
