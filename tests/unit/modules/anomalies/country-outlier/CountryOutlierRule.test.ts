import { describe, expect, it } from "vitest";
import { CountryOutlierRule } from "@/modules/anomalies/country-outlier/CountryOutlierRule";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("CountryOutlierRule", () => {
  it("matches when the cheapest price is at least belowMedianPercent below the median", () => {
    const rule = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 10, 3);

    expect(rule.matches(prices(50, 100, 100))).toBe(true);
    expect(rule.matches(prices(51, 100, 100))).toBe(false);
  });

  it("also requires the cheapest price in the PLN range", () => {
    const rule = new CountryOutlierRule(
      { channelId: 5, belowMedianPercent: 70, minPln: 50, maxPln: 200 },
      10,
      3
    );

    expect(rule.matches(prices(50, 1000, 1000))).toBe(true);
    expect(rule.matches(prices(200, 1000, 1000))).toBe(false);
    expect(rule.matches(prices(49, 1000, 1000))).toBe(false);
    expect(rule.matches(prices(150, 300, 300))).toBe(false);
  });

  it("requires the rule's minPrices countries", () => {
    const rule = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50, minPrices: 4 }, 10, 3);

    expect(rule.matches(prices(50, 100, 100))).toBe(false);
    expect(rule.matches(prices(50, 100, 100, 100))).toBe(true);
  });

  it("keeps the global minPrices as the floor", () => {
    const lower = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50, minPrices: 2 }, 10, 3);
    const without = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 10, 4);

    expect(lower.matches(prices(50, 100))).toBe(false);
    expect(lower.matches(prices(50, 100, 100))).toBe(true);
    expect(without.matches(prices(50, 100, 100))).toBe(false);
  });

  it("keeps the channel and its dropSinceSentPercent or the default one", () => {
    const own = new CountryOutlierRule(
      { channelId: 3, belowMedianPercent: 90, dropSinceSentPercent: 5 },
      10,
      3
    );
    const fallback = new CountryOutlierRule({ channelId: 4, belowMedianPercent: 90 }, 10, 3);

    expect([own.channelId, own.dropSinceSentPercent]).toEqual([3, 5]);
    expect([fallback.channelId, fallback.dropSinceSentPercent]).toEqual([4, 10]);
  });

  describe("with dealCheck", () => {
    const dealCheck = new CountryOutlierRule(
      { channelId: 10, belowMedianPercent: 70, dropSinceSentPercent: 50, dealCheck: true },
      10,
      3
    );
    const matching = prices(25, 100, 100);

    it("keeps dealCheck, false by default", () => {
      const plain = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 10, 3);

      expect(dealCheck.dealCheck).toBe(true);
      expect(plain.dealCheck).toBe(false);
    });

    it("does not match without a reported price", () => {
      expect(dealCheck.matches(matching)).toBe(false);
    });

    it("does not match when the drop since the reported price is below its dropSinceSentPercent", () => {
      expect(dealCheck.matches(matching, () => false)).toBe(false);
    });

    it("matches when the drop since the reported price reaches its dropSinceSentPercent", () => {
      expect(dealCheck.matches(matching, (percent) => percent === 50)).toBe(true);
    });

    it("still requires belowMedianPercent", () => {
      expect(dealCheck.matches(prices(31, 100, 100), () => true)).toBe(false);
    });

    it("matches a plain rule without a reported price, else only when its drop passes", () => {
      const plain = new CountryOutlierRule({ channelId: 2, belowMedianPercent: 70 }, 10, 3);

      expect(plain.matches(matching)).toBe(true);
      expect(plain.matches(matching, () => false)).toBe(false);
      expect(plain.matches(matching, (percent) => percent === 10)).toBe(true);
    });
  });
});
