import { describe, expect, it, vi } from "vitest";
import { createModules } from "@/modules";
import { createCurrencyModule } from "@/modules/currency";
import { createExclusionRulesModule } from "@/modules/exclusion-rules";
import { createMonitoringModule } from "@/modules/monitoring";
import { createAmazonModule } from "@/modules/marketplaces/amazon";
import { createSettingsModule } from "@/modules/settings";

vi.mock("@/modules/settings", () => ({
  createSettingsModule: vi.fn(() => ({ id: "settings" })),
}));
vi.mock("@/modules/currency", () => ({
  createCurrencyModule: vi.fn(() => ({
    dailyReportSection: { id: "currency-section" },
  })),
}));
vi.mock("@/modules/exclusion-rules", () => ({
  createExclusionRulesModule: vi.fn(() => ({ id: "exclusion-rules" })),
}));
vi.mock("@/modules/monitoring", () => ({
  createMonitoringModule: vi.fn(() => ({ id: "monitoring" })),
}));
vi.mock("@/modules/marketplaces/amazon", () => ({
  createAmazonModule: vi.fn(() => ({
    id: "amazon",
    exclusionRuleTarget: { id: "amazon-target" },
    dailyReportSection: { id: "amazon-section" },
  })),
}));

describe("createModules", () => {
  it("returns settings, currency, exclusion rules, monitoring and the marketplaces in order", () => {
    const modules = createModules();

    expect(modules).toEqual([
      vi.mocked(createSettingsModule).mock.results.at(-1)!.value,
      vi.mocked(createCurrencyModule).mock.results.at(-1)!.value,
      vi.mocked(createExclusionRulesModule).mock.results.at(-1)!.value,
      vi.mocked(createMonitoringModule).mock.results.at(-1)!.value,
      vi.mocked(createAmazonModule).mock.results.at(-1)!.value,
    ]);
  });

  it("gives the exclusion rules module every marketplace target", () => {
    createModules();

    expect(createExclusionRulesModule).toHaveBeenLastCalledWith([
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
