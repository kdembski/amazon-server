import { describe, expect, it } from "vitest";
import { SearchRuleValidator } from "@/modules/search-rules/services/SearchRuleValidator";

const validator = new SearchRuleValidator();
const validateSearchRule = (value: unknown) => validator.validate(value);
const validateSearchRuleScope = (scope: unknown) => validator.validateScope(scope);

describe("SearchRuleValidator.validate", () => {
  it("returns the trimmed value", () => {
    expect(validateSearchRule("  sony + !etui ")).toBe("sony + !etui");
  });

  it.each([[undefined], [5], [""], ["a++b"], ["x".repeat(64)]])(
    "rejects %j with status 400",
    (value) => {
      expect(() => validateSearchRule(value)).toThrow(
        expect.objectContaining({ status: 400 })
      );
    }
  );
});

describe("SearchRuleValidator.validateScope", () => {
  it.each([[undefined], [null], [12]])("accepts %j", (scope) => {
    expect(validateSearchRuleScope(scope)).toBe(scope);
  });

  it.each([["12"], [1.5], [true], [0], [-1]])(
    "rejects %j with status 400",
    (scope) => {
      expect(() => validateSearchRuleScope(scope)).toThrow(
        expect.objectContaining({ status: 400 })
      );
    }
  );
});
