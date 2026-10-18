import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import {
  addSeparators,
  calculateAvg,
  roundToOneDecimal,
  roundToTwoDecimals,
} from "@/shared/utils/number";

describe("roundToOneDecimal", () => {
  it("rounds a number to one decimal place as string", () => {
    expect(roundToOneDecimal(1.26)).toBe("1.3");
    expect(roundToOneDecimal(0)).toBe("0.0");
  });

  it("accepts Decimal", () => {
    expect(roundToOneDecimal(new Decimal("2.449"))).toBe("2.4");
  });

  it("returns dash for undefined", () => {
    expect(roundToOneDecimal(undefined)).toBe("-");
  });
});

describe("roundToTwoDecimals", () => {
  it("rounds a number to two decimal places as string", () => {
    expect(roundToTwoDecimals(1.234)).toBe("1.23");
    expect(roundToTwoDecimals(5)).toBe("5.00");
  });

  it("accepts Decimal", () => {
    expect(roundToTwoDecimals(new Decimal("3.456"))).toBe("3.46");
  });

  it("returns dash for undefined", () => {
    expect(roundToTwoDecimals(undefined)).toBe("-");
  });
});

describe("addSeparators", () => {
  it("inserts a space every three digits", () => {
    expect(addSeparators(1234567)).toBe("1 234 567");
    expect(addSeparators("1000")).toBe("1 000");
  });

  it("leaves short numbers untouched", () => {
    expect(addSeparators(999)).toBe("999");
  });
});

describe("calculateAvg", () => {
  it("returns the arithmetic mean", () => {
    expect(calculateAvg([1, 2, 3])).toBe(2);
  });

  it("returns 0 for empty or missing input", () => {
    expect(calculateAvg([])).toBe(0);
    expect(calculateAvg(undefined)).toBe(0);
  });
});
