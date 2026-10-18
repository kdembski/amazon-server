import { describe, expect, it, vi } from "vitest";
import { ConversionErrorRangeRule } from "@/modules/anomalies/conversion-error/ConversionErrorRangeRule";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";
import { buildListingPrice } from "../../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("ConversionErrorRangeRule", () => {
  it("exposes its channel", () => {
    expect(new ConversionErrorRangeRule("5", 50, 200).channel).toBe("5");
  });

  it("matches a cheapest price within its range", () => {
    const rule = new ConversionErrorRangeRule("5", 50, 200);

    expect(rule.matches(prices(60, 300, 300))).toBe(true);
    expect(rule.matches(prices(40, 300, 300))).toBe(false);
  });

  it("requires at least 70% difference", () => {
    const rule = new ConversionErrorRangeRule("4", 0, 50);

    expect(rule.matches(prices(40, 100, 100))).toBe(false);
  });

  it("passes the prices and its bounds to the evaluator", () => {
    const evaluator = new ConversionErrorEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const isInRange = vi.spyOn(evaluator, "isInRange").mockReturnValue(true);
    const list = prices(1, 2, 3);

    new ConversionErrorRangeRule("6", 200, undefined, evaluator).matches(
      list
    );

    expect(isOver).toHaveBeenCalledWith(list, 70);
    expect(isInRange).toHaveBeenCalledWith(list, 200, undefined);
  });
});
