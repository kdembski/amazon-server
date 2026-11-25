import { describe, expect, it } from "vitest";
import { CountryOutlierRule } from "@/modules/anomalies/country-outlier/CountryOutlierRule";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

const history = prices(10);

describe("CountryOutlierRule", () => {
  it("matches when the cheapest price is at least belowMedianPercent below the median", () => {
    const rule = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 3);

    expect(rule.matches(prices(50, 100, 100), history)).toBe(true);
    expect(rule.matches(prices(51, 100, 100), history)).toBe(false);
  });

  it("also requires the cheapest price in the PLN range", () => {
    const rule = new CountryOutlierRule({ channelId: 5, belowMedianPercent: 70, minPln: 50, maxPln: 200 }, 3);

    expect(rule.matches(prices(50, 1000, 1000), history)).toBe(true);
    expect(rule.matches(prices(200, 1000, 1000), history)).toBe(false);
    expect(rule.matches(prices(49, 1000, 1000), history)).toBe(false);
    expect(rule.matches(prices(150, 300, 300), history)).toBe(false);
  });

  it("requires the rule's minPrices countries", () => {
    const rule = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50, minPrices: 4 }, 3);

    expect(rule.matches(prices(50, 100, 100), history)).toBe(false);
    expect(rule.matches(prices(50, 100, 100, 100), history)).toBe(true);
  });

  it("keeps the global minPrices as the floor", () => {
    const lower = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50, minPrices: 2 }, 3);
    const without = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 4);

    expect(lower.matches(prices(50, 100), history)).toBe(false);
    expect(lower.matches(prices(50, 100, 100), history)).toBe(true);
    expect(without.matches(prices(50, 100, 100), history)).toBe(false);
  });

  it("keeps the channel and dealCheck, false by default", () => {
    const plain = new CountryOutlierRule({ channelId: 4, belowMedianPercent: 50 }, 3);
    const dealCheck = new CountryOutlierRule({ channelId: 3, belowMedianPercent: 50, dealCheck: true }, 3);

    expect([plain.channelId, plain.dealCheck]).toEqual([4, false]);
    expect([dealCheck.channelId, dealCheck.dealCheck]).toEqual([3, true]);
  });

  describe("with dropPercent", () => {
    const rule = new CountryOutlierRule({ channelId: 10, belowMedianPercent: 70, dropPercent: 50 }, 3);
    const matching = prices(25, 100, 100);

    it("matches when the cheapest country's newest price is dropPercent below its lowest older price", () => {
      expect(rule.matches(matching, prices(50, 100))).toBe(true);
      expect(rule.matches(matching, prices(51, 100))).toBe(false);
    });

    it("does not match without an older price", () => {
      expect(rule.matches(matching, prices(50))).toBe(false);
    });

    it("still requires belowMedianPercent", () => {
      expect(rule.matches(prices(31, 100, 100), prices(10, 100))).toBe(false);
    });
  });
});
