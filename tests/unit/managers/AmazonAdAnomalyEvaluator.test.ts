import { describe, expect, it } from "vitest";
import { AmazonAdAnomalyEvaluator } from "@/managers/AmazonAdAnomalyEvaluator";
import { buildPrice, buildPriceCountry } from "../../support/factories";

const evaluator = new AmazonAdAnomalyEvaluator();

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

describe("isCountryActive", () => {
  it("checks the country of the first price", () => {
    const inactive = buildPrice({ country: buildPriceCountry({ active: false }) });

    expect(evaluator.isCountryActive([buildPrice(), inactive])).toBe(true);
    expect(evaluator.isCountryActive([inactive, buildPrice()])).toBe(false);
  });
});

describe("isReportable", () => {
  it("requires an active country and Amazon dispatch", () => {
    const inactive = buildPriceCountry({ active: false });

    expect(evaluator.isReportable([buildPrice({ dispatchFrom: "Amazon" })])).toBe(
      true
    );
    expect(
      evaluator.isReportable([buildPrice({ dispatchFrom: "Seller X" })])
    ).toBe(false);
    expect(
      evaluator.isReportable([
        buildPrice({ dispatchFrom: "Amazon", country: inactive }),
      ])
    ).toBe(false);
  });
});
