import { describe, expect, it, vi } from "vitest";
import { createModules } from "@/modules";

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
vi.mock("@/routes/currency/CountryRouter", () =>
  fakeRouterModule("CountryRouter", "/countries")
);
vi.mock("@/routes/currency/CurrencyRouter", () =>
  fakeRouterModule("CurrencyRouter", "/currencies")
);
vi.mock("@/routes/currency/CurrencyExchangeRateRouter", () =>
  fakeRouterModule("CurrencyExchangeRateRouter", "/currencies/rates")
);
vi.mock("@/services/cron/CurrencyExchangeRateCronService", () =>
  fakeCronModule("CurrencyExchangeRateCronService")
);
vi.mock("@/services/cron/SearchRuleMatchCronService", () =>
  fakeCronModule("SearchRuleMatchCronService")
);
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
vi.mock("@/services/currency/ExchangeRateDailyReportSection", () =>
  fakeCronModule("ExchangeRateDailyReportSection")
);

describe("createModules", () => {
  it("returns the legacy module with its routers in order and crons", () => {
    const [legacy] = createModules();

    expect(legacy.routers!.map((r) => r.path)).toEqual([
      "/amazon/ads/categories",
      "/amazon/ads",
      "/amazon/ads/prices",
      "/countries",
      "/currencies",
      "/currencies/rates",
    ]);
    expect(legacy.crons).toHaveLength(2);
  });

  it("adds the monitoring module with ad and exchange rate report sections", () => {
    const monitoring = createModules()[1] as unknown as { sections: unknown[] };

    expect(monitoring.sections).toHaveLength(2);
  });
});
