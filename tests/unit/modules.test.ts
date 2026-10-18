import { describe, expect, it, vi } from "vitest";
import { createModules } from "@/modules";
import { createCurrencyModule } from "@/modules/currency";
import { createSearchRulesModule } from "@/modules/search-rules";
import { createMonitoringModule } from "@/modules/monitoring";
import { createAmazonModule } from "@/modules/marketplaces/amazon";

vi.mock("@/modules/currency", () => ({
  createCurrencyModule: vi.fn(() => ({
    dailyReportSection: { id: "currency-section" },
  })),
}));
vi.mock("@/modules/search-rules", () => ({
  createSearchRulesModule: vi.fn(() => ({ id: "search-rules" })),
}));
vi.mock("@/modules/monitoring", () => ({
  createMonitoringModule: vi.fn(() => ({ id: "monitoring" })),
}));
vi.mock("@/modules/marketplaces/amazon", () => ({
  createAmazonModule: vi.fn(() => ({
    id: "amazon",
    searchRuleTarget: { id: "amazon-target" },
    dailyReportSection: { id: "amazon-section" },
  })),
}));

describe("createModules", () => {
  it("returns currency, search rules, monitoring and the marketplaces in order", () => {
    const modules = createModules();

    expect(modules).toEqual([
      vi.mocked(createCurrencyModule).mock.results.at(-1)!.value,
      vi.mocked(createSearchRulesModule).mock.results.at(-1)!.value,
      vi.mocked(createMonitoringModule).mock.results.at(-1)!.value,
      vi.mocked(createAmazonModule).mock.results.at(-1)!.value,
    ]);
  });

  it("gives the search rules module every marketplace target", () => {
    createModules();

    expect(createSearchRulesModule).toHaveBeenLastCalledWith([
      { id: "amazon-target" },
    ]);
  });

  it("gives the monitoring module the marketplace sections before the currency section", () => {
    createModules();

    expect(createMonitoringModule).toHaveBeenLastCalledWith([
      { id: "amazon-section" },
      { id: "currency-section" },
    ]);
  });
});
