import { describe, expect, it } from "vitest";
import { ConversionErrorStrategy } from "@/modules/anomalies/conversion-error/ConversionErrorStrategy";
import { buildListingPrice } from "../../../../support/factories";

const strategy = new ConversionErrorStrategy();

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

const matchedChannels = (values: number[]) =>
  strategy.getMatchingRules(prices(...values)).map((rule) => rule.channel);

describe("ConversionErrorStrategy", () => {
  it.each([
    { values: [9, 100, 120], channels: ["3", "4"] },
    { values: [25, 100, 120], channels: ["2", "4"] },
    { values: [45, 100, 120], channels: ["1"] },
    { values: [50, 500, 500], channels: ["2", "4"] },
    { values: [60, 300, 300], channels: ["2", "5"] },
    { values: [200, 1000, 1000], channels: ["2", "5"] },
    { values: [250, 1000, 1000], channels: ["2", "6"] },
  ])("matches channels $channels for prices $values", ({ values, channels }) => {
    expect(matchedChannels(values)).toEqual(channels);
  });

  it("matches nothing below 50% difference", () => {
    expect(matchedChannels([60, 100, 120])).toEqual([]);
  });

  it("matches nothing when the cheapest price is not reportable", () => {
    const list = [
      buildListingPrice({ value: 10, reportable: false }),
      ...prices(100, 120),
    ];

    expect(strategy.getMatchingRules(list)).toEqual([]);
  });

  it("matches nothing when the cheapest country is inactive", () => {
    const list = [
      buildListingPrice({ value: 10, country: { active: false } }),
      ...prices(100, 120),
    ];

    expect(strategy.getMatchingRules(list)).toEqual([]);
  });
});
