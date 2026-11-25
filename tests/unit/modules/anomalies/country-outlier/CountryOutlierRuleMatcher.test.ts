import { describe, expect, it } from "vitest";
import { CountryOutlierRuleMatcher } from "@/modules/anomalies/country-outlier/CountryOutlierRuleMatcher";
import { Settings } from "@/modules/settings/interfaces/Settings";
import { buildListingPrice } from "../../../../support/factories";
import { fakeSettingService } from "../../../../support/fakes";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

const matcher = (values: { [K in keyof Settings]?: Settings[K] | undefined } = {}) =>
  new CountryOutlierRuleMatcher(fakeSettingService(values).service);

const matchedChannels = async (values: number[], settings: Partial<Settings> = {}) => {
  const rules = await matcher(settings).getMatches(prices(...values), prices(...values).slice(0, 1));
  return rules.map((rule) => rule.channelId);
};

describe("CountryOutlierRuleMatcher", () => {
  it.each([
    { values: [9, 100, 120], channels: [3, 4] },
    { values: [25, 100, 120], channels: [2, 4] },
    { values: [45, 100, 120], channels: [1] },
    { values: [49.99, 400, 400], channels: [2, 4] },
    { values: [50, 500, 500], channels: [2, 5] },
    { values: [60, 300, 300], channels: [2, 5] },
    { values: [199.99, 1000, 1000], channels: [2, 5] },
    { values: [200, 1000, 1000], channels: [2, 6] },
  ])("matches channels $channels for prices $values with the default rules", async ({ values, channels }) => {
    expect(await matchedChannels(values)).toEqual(channels);
  });

  it("matches nothing below 50% difference", async () => {
    expect(await matchedChannels([60, 100, 120])).toEqual([]);
  });

  it("builds the rules from the setting and takes the first match of each group", async () => {
    const settings: Partial<Settings> = {
      "countryOutlier.ruleGroups": [
        [
          { channelId: 8, belowMedianPercent: 80 },
          { channelId: 9, belowMedianPercent: 30 },
        ],
        [{ channelId: 10, belowMedianPercent: 30, minPln: 100 }],
      ],
    };

    expect(await matchedChannels([60, 100, 120], settings)).toEqual([9]);
  });

  it("tries the next rule of a group when a rule needs more countries", async () => {
    const settings: Partial<Settings> = {
      "countryOutlier.ruleGroups": [
        [
          { channelId: 8, belowMedianPercent: 50, minPrices: 4 },
          { channelId: 9, belowMedianPercent: 50 },
        ],
      ],
    };

    expect(await matchedChannels([10, 100, 120], settings)).toEqual([9]);
    expect(await matchedChannels([10, 100, 120, 130], settings)).toEqual([8]);
  });

  it.each([
    "countryOutlier.ruleGroups",
    "countryOutlier.minPrices",
  ] as const)(
    "matches nothing without the %s setting",
    async (key) => {
      const rules = await matcher({ [key]: undefined }).getMatches(prices(9, 100, 120), prices(9));
      expect(rules).toEqual([]);
    }
  );

  it("matches nothing without rule groups", async () => {
    expect(await matchedChannels([9, 100, 120], { "countryOutlier.ruleGroups": [] })).toEqual([]);
  });

  it("matches nothing when the cheapest price is not reportable", async () => {
    const list = [
      buildListingPrice({ value: 10, reportable: false }),
      ...prices(100, 120),
    ];

    expect(await matcher().getMatches(list, list.slice(0, 1))).toEqual([]);
  });

  it("matches nothing when the cheapest country is inactive", async () => {
    const list = [
      buildListingPrice({ value: 10, country: { active: false } }),
      ...prices(100, 120),
    ];

    expect(await matcher().getMatches(list, list.slice(0, 1))).toEqual([]);
  });

  it("falls through a dropPercent rule to the next rule of its group when the drop is too small", async () => {
    const settings: Partial<Settings> = {
      "countryOutlier.ruleGroups": [
        [
          { channelId: 10, belowMedianPercent: 70, dropPercent: 50, dealCheck: true },
          { channelId: 2, belowMedianPercent: 70 },
        ],
      ],
    };
    const getChannels = async (history: number[]) => {
      const rules = await matcher(settings).getMatches(prices(25, 100, 120), prices(...history));
      return rules.map((rule) => [rule.channelId, rule.dealCheck]);
    };

    expect(await getChannels([25, 50])).toEqual([[10, true]]);
    expect(await getChannels([25, 40])).toEqual([[2, false]]);
    expect(await getChannels([25])).toEqual([[2, false]]);
  });
});
