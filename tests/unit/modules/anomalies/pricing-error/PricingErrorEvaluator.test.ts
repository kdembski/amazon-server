import { describe, expect, it } from "vitest";
import { PricingErrorEvaluator } from "@/modules/anomalies/pricing-error/PricingErrorEvaluator";
import { ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { buildListingPrice } from "../../../../support/factories";

const evaluator = new PricingErrorEvaluator();

// newest price first, as the marketplace passes them in
const history = (...values: number[]) =>
  values.map((value) => buildListingPrice({ value }));

describe("isOverPercentageDifference", () => {
  it("is true when the newest price is at most 50% of the previous and below all older ones", () => {
    expect(evaluator.isOverPercentageDifference(history(50, 100, 80))).toBe(true);
  });

  it("is false when the drop is smaller than 50%", () => {
    expect(evaluator.isOverPercentageDifference(history(51, 100))).toBe(false);
  });

  it("is false when an older price was lower than or equal to the newest", () => {
    expect(evaluator.isOverPercentageDifference(history(40, 100, 30))).toBe(false);
    expect(evaluator.isOverPercentageDifference(history(40, 100, 40))).toBe(false);
  });

  it("is false with a single price or without a value", () => {
    expect(evaluator.isOverPercentageDifference(history(40))).toBe(false);
    expect(
      evaluator.isOverPercentageDifference([
        {} as ListingPrice,
        ...history(100),
      ])
    ).toBe(false);
  });

  it("inherits the shared checks", () => {
    expect(evaluator.isReportable([buildListingPrice()])).toBe(true);
  });
});
