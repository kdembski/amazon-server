import { describe, expect, it, vi } from "vitest";
import { CountryOutlierRangeRule } from "@/modules/anomalies/country-outlier/CountryOutlierRangeRule";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("CountryOutlierRangeRule", () => {
  it("exposes its channel", () => {
    expect(new CountryOutlierRangeRule("5", 50, 200).channel).toBe("5");
  });

  it("matches a cheapest price within its range", () => {
    const rule = new CountryOutlierRangeRule("5", 50, 200);

    expect(rule.matches(prices(60, 300, 300))).toBe(true);
    expect(rule.matches(prices(40, 300, 300))).toBe(false);
  });

  it("requires at least 70% difference", () => {
    const rule = new CountryOutlierRangeRule("4", 0, 50);

    expect(rule.matches(prices(40, 100, 100))).toBe(false);
  });

  it("passes the prices and its bounds to the evaluator", () => {
    const evaluator = new CountryOutlierEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const isInRange = vi.spyOn(evaluator, "isInRange").mockReturnValue(true);
    const list = prices(1, 2, 3);

    new CountryOutlierRangeRule("6", 200, undefined, evaluator).matches(
      list
    );

    expect(isOver).toHaveBeenCalledWith(list, 70);
    expect(isInRange).toHaveBeenCalledWith(list, 200, undefined);
  });
});
