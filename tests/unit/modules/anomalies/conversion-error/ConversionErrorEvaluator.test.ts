import { describe, expect, it } from "vitest";
import { ConversionErrorEvaluator } from "@/modules/anomalies/conversion-error/ConversionErrorEvaluator";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { buildListingPrice } from "../../../../support/factories";

const evaluator = new ConversionErrorEvaluator();
const prices = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

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

  it("compares with the median of the other prices, not only the second one", () => {
    // Median of 36, 54, 55 is 54: 25 is 53.7% below it, though only 30.6% below 36.
    expect(evaluator.isOverPercentageDifference(prices(25, 36, 54, 55), 50)).toBe(true);
    // Median of 30, 200, 400 is 200, regardless of their order.
    expect(evaluator.isOverPercentageDifference(prices(100, 400, 30, 200), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(101, 400, 30, 200), 50)).toBe(false);
  });

  it("averages the two middle prices for an even number of other prices", () => {
    // Median of 60 and 140 is 100.
    expect(evaluator.isOverPercentageDifference(prices(50, 60, 140), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(51, 60, 140), 50)).toBe(false);
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
    expect(evaluator.isInRange([{} as ListingPrice], 0, 50)).toBeUndefined();
  });
});
