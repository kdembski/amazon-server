import { describe, expect, it } from "vitest";
import { AmazonAdPricingErrorEvaluator } from "@/managers/pricing-error/AmazonAdPricingErrorEvaluator";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { buildPrice } from "../../../support/factories";

const evaluator = new AmazonAdPricingErrorEvaluator();

// newest price first, as returned by AmazonAdPriceRepository.getByAdAndCountry
const history = (...values: number[]) =>
  values.map((value) => buildPrice({ value }));

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
        {} as AmazonAdPriceSelectDto,
        ...history(100),
      ])
    ).toBe(false);
  });

  it("inherits the shared checks", () => {
    expect(
      evaluator.isReportable([buildPrice({ dispatchFrom: "Amazon" })])
    ).toBe(true);
  });
});
