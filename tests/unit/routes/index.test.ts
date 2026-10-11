import { describe, expect, it, vi } from "vitest";
import { useRouter } from "@/routes";

const { use, fakeRouterModule } = vi.hoisted(() => {
  const use = vi.fn();
  const fakeRouterModule = (exportName: string, path: string) => ({
    [exportName]: vi.fn(function () {
      return { path, build: () => ({ router: path }) };
    }),
  });
  return { use, fakeRouterModule };
});

vi.mock("express", async (importOriginal) => {
  const original = await importOriginal<typeof import("express")>();
  return { ...original, Router: () => ({ use }) };
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
vi.mock("@/routes/SystemRouter", () =>
  fakeRouterModule("SystemRouter", "/system")
);

describe("useRouter", () => {
  it("mounts every sub router under its path", () => {
    const { router } = useRouter();

    expect(router).toEqual({ use });
    expect(use.mock.calls).toEqual([
      ["/amazon/ads/categories", "/amazon/ads/categories"],
      ["/amazon/ads", "/amazon/ads"],
      ["/amazon/ads/prices", "/amazon/ads/prices"],
      ["/countries", "/countries"],
      ["/currencies", "/currencies"],
      ["/currencies/rates", "/currencies/rates"],
      ["/scrapers", "/scrapers"],
      ["/system", "/system"],
    ]);
  });
});
