import { describe, expect, it, vi } from "vitest";
import { PriceDropManager } from "@/modules/anomalies/price-drop/PriceDropManager";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { PriceDropRuleMatcher } from "@/modules/anomalies/price-drop/PriceDropRuleMatcher";
import { Settings } from "@/modules/settings/interfaces/Settings";
import { buildListingPrice } from "../../../../support/factories";
import { fakeSettingService } from "../../../../support/fakes";

const setup = (ruleGroups?: Settings["priceDrop.ruleGroups"]) => {
  const reporter = { report: vi.fn().mockResolvedValue(undefined), checkDeal: vi.fn().mockResolvedValue(undefined) };
  const settings = fakeSettingService(ruleGroups ? { "priceDrop.ruleGroups": ruleGroups } : {});
  const matcher = new PriceDropRuleMatcher(settings.service);
  const manager = new PriceDropManager(reporter, new PriceDropEvaluator(), matcher);
  return { manager, reporter, settings, listing: { id: 1 } };
};

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("PriceDropManager", () => {
  it("sends the matching countries to the channel of the matched rule", async () => {
    const { manager, reporter, listing } = setup();
    const country = history(40, 100, 80);

    await manager.check(listing, [country]);

    expect(reporter.report).toHaveBeenCalledWith(listing, [country], 7);
  });

  it("does not send when no rule matches", async () => {
    const { manager, reporter, listing } = setup();

    await manager.check(listing, [history(51, 100)]);

    expect(reporter.report).not.toHaveBeenCalled();
  });

  it("sends every matched channel all matched countries", async () => {
    const { manager, reporter, listing } = setup([
      [{ channelId: 1, dropPercent: 70 }],
      [{ channelId: 2, dropPercent: 50 }],
    ]);
    const strong = history(20, 100);
    const weak = history(40, 100);

    await manager.check(listing, [weak, strong]);

    expect(reporter.report.mock.calls).toEqual([
      [listing, [weak, strong], 2],
      [listing, [weak, strong], 1],
    ]);
  });

  it("matches only reportable countries of active marketplaces", async () => {
    const { manager, reporter, settings, listing } = setup();
    const notReportable = [
      buildListingPrice({ value: 40, reportable: false }),
      buildListingPrice({ value: 100 }),
    ];
    const inactive = [
      buildListingPrice({ value: 40, country: { active: false } }),
      buildListingPrice({ value: 100, country: { active: false } }),
    ];

    await manager.check(listing, [notReportable, inactive]);

    expect(reporter.report).not.toHaveBeenCalled();
    expect(settings.get).not.toHaveBeenCalled();
  });

  it("sends only the matching countries", async () => {
    const { manager, reporter, listing } = setup();
    const matching = history(40, 100);

    await manager.check(listing, [history(90, 100), matching]);

    expect(reporter.report).toHaveBeenCalledWith(listing, [matching], 7);
  });

  it("deal-checks the channel of a dealCheck rule and reports the others", async () => {
    const { manager, reporter, listing } = setup([
      [{ channelId: 9, dropPercent: 80, dealCheck: true }],
      [{ channelId: 7, dropPercent: 50 }],
    ]);
    const country = history(10, 100);

    await manager.check(listing, [country]);

    expect(reporter.checkDeal.mock.calls).toEqual([[listing, [country], 9]]);
    expect(reporter.report.mock.calls).toEqual([[listing, [country], 7]]);
  });
});
