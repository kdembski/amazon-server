import { describe, expect, it } from "vitest";
import { AnomalyEvaluator } from "@/modules/anomalies/AnomalyEvaluator";
import { buildListingPrice } from "../../../support/factories";

const evaluator = new AnomalyEvaluator();

const newest = (reportable: boolean, active: boolean) => [
  buildListingPrice({ reportable, country: { active } }),
  buildListingPrice(),
];

describe("isReportable", () => {
  it("is reportable only when the newest price is reportable and its country active", () => {
    expect(evaluator.isReportable(newest(true, true))).toBe(true);
    expect(evaluator.isReportable(newest(true, false))).toBe(false);
    expect(evaluator.isReportable(newest(false, true))).toBe(false);
    expect(evaluator.isReportable(newest(false, false))).toBe(false);
  });

  it("ignores older prices", () => {
    const older = buildListingPrice({
      reportable: false,
      country: { active: false },
    });

    expect(evaluator.isReportable([buildListingPrice(), older])).toBe(true);
  });
});
