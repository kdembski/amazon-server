import { describe, expect, it, vi } from "vitest";
import { AmazonAdConversionErrorRangeRule } from "@/managers/conversion-error/AmazonAdConversionErrorRangeRule";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { buildPrice } from "../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

describe("AmazonAdConversionErrorRangeRule", () => {
  it("exposes its channel", () => {
    expect(new AmazonAdConversionErrorRangeRule("5", 50, 200).channel).toBe("5");
  });

  it("matches a cheapest price within its range", () => {
    const rule = new AmazonAdConversionErrorRangeRule("5", 50, 200);

    expect(rule.matches(prices(60, 300, 300))).toBe(true);
    expect(rule.matches(prices(40, 300, 300))).toBe(false);
  });

  it("requires at least 70% difference", () => {
    const rule = new AmazonAdConversionErrorRangeRule("4", 0, 50);

    expect(rule.matches(prices(40, 100, 100))).toBe(false);
  });

  it("passes the prices and its bounds to the evaluator", () => {
    const evaluator = new AmazonAdConversionErrorEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const isInRange = vi.spyOn(evaluator, "isInRange").mockReturnValue(true);
    const list = prices(1, 2, 3);

    new AmazonAdConversionErrorRangeRule("6", 200, undefined, evaluator).matches(
      list
    );

    expect(isOver).toHaveBeenCalledWith(list, 70);
    expect(isInRange).toHaveBeenCalledWith(list, 200, undefined);
  });
});
