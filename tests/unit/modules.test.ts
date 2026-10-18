import { describe, expect, it, vi } from "vitest";
import { createModules } from "@/modules";
import { createCurrencyModule } from "@/modules/currency";
import { createSearchRulesModule } from "@/modules/search-rules";

const { fakeRouterModule, fakeCronModule } = vi.hoisted(() => {
  const fakeRouterModule = (exportName: string, path: string) => ({
    [exportName]: vi.fn(function () {
      return { path, build: () => ({ router: path }) };
    }),
  });
  const fakeCronModule = (exportName: string) => ({
    [exportName]: vi.fn(function () {
      return { schedule: vi.fn() };
    }),
  });
  return { fakeRouterModule, fakeCronModule };
});

vi.mock("@/routes/amazon/AmazonAdCategoryRouter", () =>
  fakeRouterModule("AmazonAdCategoryRouter", "/amazon/ads/categories")
);
vi.mock("@/routes/amazon/AmazonAdRouter", () =>
  fakeRouterModule("AmazonAdRouter", "/amazon/ads")
);
vi.mock("@/routes/amazon/AmazonAdPriceRouter", () =>
  fakeRouterModule("AmazonAdPriceRouter", "/amazon/ads/prices")
);
vi.mock("@/modules/currency", () => ({
  createCurrencyModule: vi.fn(() => ({
    routers: [],
    crons: [],
    dailyReportSection: { id: "currency-section" },
  })),
}));
vi.mock("@/modules/search-rules", () => ({
  createSearchRulesModule: vi.fn((targets: unknown[]) => ({ targets })),
}));
vi.mock("@/repositories/amazon/AmazonAdRepository", () => ({
  AmazonAdRepository: vi.fn(function () {
    return { id: "ad-repository" };
  }),
}));
vi.mock("@/modules/monitoring", () => ({
  createMonitoringModule: vi.fn((sections: unknown[]) => ({
    routers: [],
    crons: [],
    sections,
  })),
}));
vi.mock("@/services/amazon/AmazonAdDailyReportSection", () =>
  fakeCronModule("AmazonAdDailyReportSection")
);

describe("createModules", () => {
  it("returns the currency module first", () => {
    const [currency] = createModules();

    expect(currency).toBe(
      vi.mocked(createCurrencyModule).mock.results.at(-1)!.value
    );
  });

  it("returns the legacy module with its routers in order and no crons", () => {
    const legacy = createModules()[1];

    expect(legacy.routers!.map((r) => r.path)).toEqual([
      "/amazon/ads/categories",
      "/amazon/ads",
      "/amazon/ads/prices",
    ]);
    expect(legacy.crons).toBeUndefined();
  });

  it("adds the search rules module matching the ad repository", () => {
    const searchRules = createModules()[2];

    expect(searchRules).toBe(
      vi.mocked(createSearchRulesModule).mock.results.at(-1)!.value
    );
    expect(searchRules).toEqual({ targets: [{ id: "ad-repository" }] });
  });

  it("adds the monitoring module with the ad section first and the currency section second", () => {
    const monitoring = createModules()[3] as unknown as { sections: unknown[] };

    expect(monitoring.sections).toHaveLength(2);
    expect(monitoring.sections[1]).toEqual({ id: "currency-section" });
  });
});
