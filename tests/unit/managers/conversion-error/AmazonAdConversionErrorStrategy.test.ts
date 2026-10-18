import { describe, expect, it } from "vitest";
import { AmazonAdConversionErrorStrategy } from "@/managers/conversion-error/AmazonAdConversionErrorStrategy";
import { buildPrice, buildPriceCountry } from "../../../support/factories";

const strategy = new AmazonAdConversionErrorStrategy();

const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

const matchedChannels = (values: number[]) =>
  strategy.getMatchingRules(prices(...values)).map((rule) => rule.channel);

describe("AmazonAdConversionErrorStrategy", () => {
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

  it("matches nothing when the cheapest offer is not dispatched by Amazon", () => {
    const list = [
      buildPrice({ value: 10, dispatchFrom: "Seller" }),
      ...prices(100, 120),
    ];

    expect(strategy.getMatchingRules(list)).toEqual([]);
  });

  it("matches nothing when the cheapest country is inactive", () => {
    const list = [
      buildPrice({ value: 10, country: buildPriceCountry({ active: false }) }),
      ...prices(100, 120),
    ];

    expect(strategy.getMatchingRules(list)).toEqual([]);
  });
});
