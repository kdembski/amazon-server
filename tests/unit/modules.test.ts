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
vi.mock("@/routes/ScraperStatusRouter", () =>
  fakeRouterModule("ScraperStatusRouter", "/scrapers")
);
vi.mock("@/services/cron/CurrencyExchangeRateCronService", () =>
  fakeCronModule("CurrencyExchangeRateCronService")
);
vi.mock("@/services/cron/HourlyStatsCronService", () =>
  fakeCronModule("HourlyStatsCronService")
);
vi.mock("@/services/cron/DailyStatsCronService", () =>
  fakeCronModule("DailyStatsCronService")
);
vi.mock("@/services/cron/LogCleanupCronService", () =>
  fakeCronModule("LogCleanupCronService")
);
vi.mock("@/services/cron/SearchRuleMatchCronService", () =>
  fakeCronModule("SearchRuleMatchCronService")
);

describe("createModules", () => {
  it("returns the legacy module with every router in order and all crons", () => {
    const [legacy] = createModules();

    expect(legacy.routers!.map((r) => r.path)).toEqual([
      "/amazon/ads/categories",
      "/amazon/ads",
      "/amazon/ads/prices",
      "/countries",
      "/currencies",
      "/currencies/rates",
      "/scrapers",
    ]);
    expect(legacy.crons).toHaveLength(5);
  });
});
