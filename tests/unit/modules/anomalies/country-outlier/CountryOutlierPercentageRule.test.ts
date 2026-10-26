import { describe, expect, it, vi } from "vitest";
import { CountryOutlierPercentageRule } from "@/modules/anomalies/country-outlier/CountryOutlierPercentageRule";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("CountryOutlierPercentageRule", () => {
  it("exposes its channel", () => {
    expect(new CountryOutlierPercentageRule("2", 70).channel).toBe("2");
  });

  it("matches when the price difference reaches its percentage", () => {
    const rule = new CountryOutlierPercentageRule("2", 70);

    // Weights 2, 1 on 100 and 120 put the median at 100.
    expect(rule.matches(prices(30, 100, 120))).toBe(true);
    expect(rule.matches(prices(31, 100, 120))).toBe(false);
  });

  it("passes the prices and its percentage to the evaluator", () => {
    const evaluator = new CountryOutlierEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const list = prices(1, 2, 3);

    new CountryOutlierPercentageRule("1", 50, evaluator).matches(list);

    expect(isOver).toHaveBeenCalledWith(list, 50);
  });
});
