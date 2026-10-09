import { describe, expect, it } from "vitest";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { buildPrice } from "../../../support/factories";

const evaluator = new AmazonAdConversionErrorEvaluator();
const prices = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

describe("isOverPercentageDifference", () => {
  it("is true when the first price is at most (100 - percentage)% of the second", () => {
    // 1 - 90 / 100 is 0.0999… in floating point, so the exact 10% boundary
    // is not matched; 9 of 100 is safely inside the threshold.
    expect(evaluator.isOverPercentageDifference(prices(9, 100), 90)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(30, 100), 70)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(50, 100), 50)).toBe(true);
  });

  it("is false just above the threshold", () => {
    expect(evaluator.isOverPercentageDifference(prices(11, 100), 90)).toBe(false);
    expect(evaluator.isOverPercentageDifference(prices(51, 100), 50)).toBe(false);
  });
});

describe("isInRange", () => {
  it("checks min and max inclusively", () => {
    expect(evaluator.isInRange(prices(50), 50, 200)).toBe(true);
    expect(evaluator.isInRange(prices(200), 50, 200)).toBe(true);
    expect(evaluator.isInRange(prices(201), 50, 200)).toBe(false);
  });

  it("treats min=0 as 'only max'", () => {
    expect(evaluator.isInRange(prices(30), 0, 50)).toBe(true);
    expect(evaluator.isInRange(prices(60), 0, 50)).toBe(false);
  });

  it("checks only min when max is missing", () => {
    expect(evaluator.isInRange(prices(250), 200)).toBe(true);
    expect(evaluator.isInRange(prices(199), 200)).toBe(false);
  });

  it("checks only max when min is missing", () => {
    expect(evaluator.isInRange(prices(10), undefined, 50)).toBe(true);
  });

  it("returns undefined without bounds or without a value", () => {
    expect(evaluator.isInRange(prices(10))).toBeUndefined();
    expect(
      evaluator.isInRange([{} as AmazonAdPriceSelectDto], 0, 50)
    ).toBeUndefined();
  });
});

describe("isAmazonDispatch", () => {
  it("is truthy only for 'Amazon'", () => {
    expect(
      evaluator.isAmazonDispatch([buildPrice({ dispatchFrom: "Amazon" })])
    ).toBe(true);
    expect(
      evaluator.isAmazonDispatch([buildPrice({ dispatchFrom: "Seller X" })])
    ).toBe(false);
    expect(
      evaluator.isAmazonDispatch([buildPrice({ dispatchFrom: null })])
    ).toBeFalsy();
  });
});
