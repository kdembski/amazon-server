import { describe, expect, it, vi } from "vitest";
import { ConversionErrorPercentageRule } from "@/modules/anomalies/conversion-error/ConversionErrorPercentageRule";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("ConversionErrorPercentageRule", () => {
  it("exposes its channel", () => {
    expect(new ConversionErrorPercentageRule("2", 70).channel).toBe("2");
  });

  it("matches when the price difference reaches its percentage", () => {
    const rule = new ConversionErrorPercentageRule("2", 70);

    // Median of 100 and 120 is 110.
    expect(rule.matches(prices(32, 100, 120))).toBe(true);
    expect(rule.matches(prices(34, 100, 120))).toBe(false);
  });

  it("passes the prices and its percentage to the evaluator", () => {
    const evaluator = new ConversionErrorEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const list = prices(1, 2, 3);

    new ConversionErrorPercentageRule("1", 50, evaluator).matches(list);

    expect(isOver).toHaveBeenCalledWith(list, 50);
  });
});
