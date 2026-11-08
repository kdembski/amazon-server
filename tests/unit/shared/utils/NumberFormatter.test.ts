import { describe, expect, it } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { NumberFormatter } from "@/shared/utils/NumberFormatter";

describe("NumberFormatter.round", () => {
  it("rounds a number to the decimal places as a string", () => {
    expect(NumberFormatter.round(1.26, 1)).toBe("1.3");
    expect(NumberFormatter.round(0, 1)).toBe("0.0");
    expect(NumberFormatter.round(1.234, 2)).toBe("1.23");
    expect(NumberFormatter.round(5, 2)).toBe("5.00");
  });

  it("accepts Decimal", () => {
    expect(NumberFormatter.round(new Decimal("2.449"), 1)).toBe("2.4");
    expect(NumberFormatter.round(new Decimal("3.456"), 2)).toBe("3.46");
  });

  it("returns dash for undefined", () => {
    expect(NumberFormatter.round(undefined, 2)).toBe("-");
  });
});

describe("NumberFormatter.addSeparators", () => {
  it("inserts a space every three digits", () => {
    expect(NumberFormatter.addSeparators(1234567)).toBe("1 234 567");
    expect(NumberFormatter.addSeparators("1000")).toBe("1 000");
  });

  it("leaves short numbers untouched", () => {
    expect(NumberFormatter.addSeparators(999)).toBe("999");
  });
});
