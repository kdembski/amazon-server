import { describe, expect, it } from "vitest";
import { PriceDropRuleMatcher } from "@/modules/anomalies/price-drop/PriceDropRuleMatcher";
import { Settings } from "@/modules/settings/interfaces/Settings";
import { buildListingPrice } from "../../../../support/factories";
import { fakeSettingService } from "../../../../support/fakes";

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

const matcher = (ruleGroups?: Settings["priceDrop.ruleGroups"]) => {
  return new PriceDropRuleMatcher(fakeSettingService({ "priceDrop.ruleGroups": ruleGroups }).service);
};

const plain = (channelId: number) => ({ channelId, dealCheck: false });

describe("PriceDropRuleMatcher", () => {
  it("takes the first matching rule of each group per country", async () => {
    const groups = [
      [
        { channelId: 1, dropPercent: 80 },
        { channelId: 2, dropPercent: 50 },
      ],
      [{ channelId: 3, dropPercent: 50 }],
    ];
    const country = history(40, 100);

    expect(await matcher(groups).getMatches([country])).toEqual({
      countryPrices: [country],
      channels: [plain(2), plain(3)],
    });
  });

  it("collects the distinct channels of all countries and every matched country", async () => {
    const groups = [
      [
        { channelId: 1, dropPercent: 80 },
        { channelId: 2, dropPercent: 50 },
      ],
    ];
    const strong = history(10, 100);
    const weak = history(40, 100);
    const weaker = history(45, 100);

    expect(await matcher(groups).getMatches([weak, strong, history(90, 100), weaker])).toEqual({
      countryPrices: [weak, strong, weaker],
      channels: [plain(2), plain(1)],
    });
  });

  it("matches nothing without the priceDrop.ruleGroups setting", async () => {
    expect(await matcher().getMatches([history(10, 100)])).toEqual({ countryPrices: [], channels: [] });
  });

  it("keeps dealCheck of the channel's first matched rule in group order", async () => {
    const groups = [
      [{ channelId: 9, dropPercent: 80, dealCheck: true }],
      [{ channelId: 9, dropPercent: 50 }],
    ];

    expect((await matcher(groups).getMatches([history(10, 100)])).channels).toEqual([
      { channelId: 9, dealCheck: true },
    ]);
  });
});
