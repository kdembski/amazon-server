import { describe, expect, it } from "vitest";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { buildListingPrice } from "../../../../support/factories";

const evaluator = new CountryOutlierEvaluator();
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

  it("compares with the median of the other prices weighted towards the cheaper ones", () => {
    // Weights 4, 3, 2, 1 on 60, 100, 300, 900 put the median at 100, not 200.
    expect(evaluator.isOverPercentageDifference(prices(50, 60, 100, 300, 900), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(51, 60, 100, 300, 900), 50)).toBe(false);
    // Weights 2, 1 on 60 and 140 put the median at 60.
    expect(evaluator.isOverPercentageDifference(prices(30, 60, 140), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(31, 60, 140), 50)).toBe(false);
  });

  it("averages with the next price when the cumulative weight is exactly half", () => {
    // Weights 3, 2, 1 on 30, 200, 400: 30 holds exactly half, so the median is 115, regardless of order.
    expect(evaluator.isOverPercentageDifference(prices(57, 400, 30, 200), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(prices(58, 400, 30, 200), 50)).toBe(false);
  });
});

describe("isInRange", () => {
  it("includes min and excludes max", () => {
    expect(evaluator.isInRange(prices(50), 50, 200)).toBe(true);
    expect(evaluator.isInRange(prices(199.99), 50, 200)).toBe(true);
    expect(evaluator.isInRange(prices(200), 50, 200)).toBe(false);
    expect(evaluator.isInRange(prices(49.99), 50, 200)).toBe(false);
  });

  it("checks min = 0", () => {
    expect(evaluator.isInRange(prices(0), 0, 50)).toBe(true);
    expect(evaluator.isInRange(prices(60), 0, 50)).toBe(false);
  });

  it("checks only min when max is missing", () => {
    expect(evaluator.isInRange(prices(250), 200)).toBe(true);
    expect(evaluator.isInRange(prices(199), 200)).toBe(false);
  });

  it("checks only max when min is missing", () => {
    expect(evaluator.isInRange(prices(10), undefined, 50)).toBe(true);
    expect(evaluator.isInRange(prices(50), undefined, 50)).toBe(false);
  });

  it("matches every price without bounds", () => {
    expect(evaluator.isInRange(prices(10))).toBe(true);
  });
});
