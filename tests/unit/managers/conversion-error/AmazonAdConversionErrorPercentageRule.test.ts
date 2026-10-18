import { describe, expect, it, vi } from "vitest";
import { AmazonAdConversionErrorPercentageRule } from "@/managers/conversion-error/AmazonAdConversionErrorPercentageRule";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { buildPrice } from "../../../support/factories";

const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

describe("AmazonAdConversionErrorPercentageRule", () => {
  it("exposes its channel", () => {
    expect(new AmazonAdConversionErrorPercentageRule("2", 70).channel).toBe("2");
  });

  it("matches when the price difference reaches its percentage", () => {
    const rule = new AmazonAdConversionErrorPercentageRule("2", 70);

    expect(rule.matches(prices(30, 100, 120))).toBe(true);
    expect(rule.matches(prices(31, 100, 120))).toBe(false);
  });

  it("passes the prices and its percentage to the evaluator", () => {
    const evaluator = new AmazonAdConversionErrorEvaluator();
    const isOver = vi
      .spyOn(evaluator, "isOverPercentageDifference")
      .mockReturnValue(true);
    const list = prices(1, 2, 3);

    new AmazonAdConversionErrorPercentageRule("1", 50, evaluator).matches(list);

    expect(isOver).toHaveBeenCalledWith(list, 50);
  });
});
