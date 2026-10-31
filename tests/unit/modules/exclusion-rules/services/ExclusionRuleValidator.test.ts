import { describe, expect, it } from "vitest";
import { ExclusionRuleValidator } from "@/modules/exclusion-rules/services/ExclusionRuleValidator";

const validator = new ExclusionRuleValidator();
const validateExclusionRule = (value: unknown) => validator.validate(value);
const validateExclusionRuleScope = (scope: unknown) => validator.validateScope(scope);

describe("ExclusionRuleValidator.validate", () => {
  it("returns the trimmed value", () => {
    expect(validateExclusionRule("  sony + !etui ")).toBe("sony + !etui");
  });

  it.each([[undefined], [5], [""], ["a++b"], ["x".repeat(513)], ["!etui"]])(
    "rejects %j with status 400",
    (value) => {
      expect(() => validateExclusionRule(value)).toThrow(
        expect.objectContaining({ status: 400 })
      );
    }
  );
});

describe("ExclusionRuleValidator.validateInverted", () => {
  it.each([
    [undefined, null],
    [false, null],
    [false, undefined],
    [true, 3],
  ])("accepts %j with scope %j", (inverted, scope) => {
    expect(validator.validateInverted(inverted, scope)).toBe(inverted);
  });

  it.each([
    ["true", 3],
    [1, 3],
    [true, null],
    [true, undefined],
  ])("rejects %j with scope %j with status 400", (inverted, scope) => {
    expect(() => validator.validateInverted(inverted, scope)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});

describe("ExclusionRuleValidator.validateScope", () => {
  it.each([[undefined], [null], [12]])("accepts %j", (scope) => {
    expect(validateExclusionRuleScope(scope)).toBe(scope);
  });

  it.each([["12"], [1.5], [true], [0], [-1]])(
    "rejects %j with status 400",
    (scope) => {
      expect(() => validateExclusionRuleScope(scope)).toThrow(
        expect.objectContaining({ status: 400 })
      );
    }
  );
});
