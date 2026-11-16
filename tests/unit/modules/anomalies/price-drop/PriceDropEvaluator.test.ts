import { describe, expect, it } from "vitest";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { buildListingPrice } from "../../../../support/factories";

const evaluator = new PriceDropEvaluator();

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("isOverPercentageDifference", () => {
  it("is true when the newest price is at most 50% of the lowest older one", () => {
    expect(evaluator.isOverPercentageDifference(history(40, 100, 80), 50)).toBe(true);
    expect(evaluator.isOverPercentageDifference(history(50, 100), 50)).toBe(true);
  });

  it("is false when the drop is smaller than 50%", () => {
    expect(evaluator.isOverPercentageDifference(history(51, 100), 50)).toBe(false);
    expect(evaluator.isOverPercentageDifference(history(41, 100, 80), 50)).toBe(false);
  });

  it("is false when a temporary spike is followed by a return to the earlier price", () => {
    expect(evaluator.isOverPercentageDifference(history(44.24, 111, 47.12), 50)).toBe(false);
    expect(evaluator.isOverPercentageDifference(history(23, 111, 47.12), 50)).toBe(true);
  });

  it("is blocked by any lower older price", () => {
    expect(evaluator.isOverPercentageDifference(history(40, 100, 100, 30, 100), 50)).toBe(false);
    expect(evaluator.isOverPercentageDifference(history(40, 40, 100, 100), 50)).toBe(false);
  });

  it("is false with a single price or without a value", () => {
    expect(evaluator.isOverPercentageDifference(history(40), 50)).toBe(false);
    expect(
      evaluator.isOverPercentageDifference([
        {} as ListingPrice,
        ...history(100),
      ], 50)
    ).toBe(false);
  });

  it("uses the given drop percent", () => {
    expect(evaluator.isOverPercentageDifference(history(70, 100), 30)).toBe(true);
    expect(evaluator.isOverPercentageDifference(history(71, 100), 30)).toBe(false);
  });

  it("inherits the shared checks", () => {
    expect(evaluator.isReportable([buildListingPrice()])).toBe(true);
  });
});
