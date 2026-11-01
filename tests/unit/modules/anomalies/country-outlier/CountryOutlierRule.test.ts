import { describe, expect, it } from "vitest";
import { CountryOutlierRule } from "@/modules/anomalies/country-outlier/CountryOutlierRule";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("CountryOutlierRule", () => {
  it("matches when the cheapest price is at least belowMedianPercent below the median", () => {
    const rule = new CountryOutlierRule({ channelId: 1, belowMedianPercent: 50 }, 10);

    expect(rule.matches(prices(50, 100, 100))).toBe(true);
    expect(rule.matches(prices(51, 100, 100))).toBe(false);
  });

  it("also requires the cheapest price in the PLN range", () => {
    const rule = new CountryOutlierRule(
      { channelId: 5, belowMedianPercent: 70, minPln: 50, maxPln: 200 },
      10
    );

    expect(rule.matches(prices(50, 1000, 1000))).toBe(true);
    expect(rule.matches(prices(200, 1000, 1000))).toBe(false);
    expect(rule.matches(prices(49, 1000, 1000))).toBe(false);
    expect(rule.matches(prices(150, 300, 300))).toBe(false);
  });

  it("keeps the channel and its dropSinceSentPercent or the default one", () => {
    const own = new CountryOutlierRule(
      { channelId: 3, belowMedianPercent: 90, dropSinceSentPercent: 5 },
      10
    );
    const fallback = new CountryOutlierRule({ channelId: 4, belowMedianPercent: 90 }, 10);

    expect([own.channelId, own.dropSinceSentPercent]).toEqual([3, 5]);
    expect([fallback.channelId, fallback.dropSinceSentPercent]).toEqual([4, 10]);
  });
});
