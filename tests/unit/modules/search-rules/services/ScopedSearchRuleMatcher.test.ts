import { describe, expect, it } from "vitest";
import { SearchRuleParser } from "@/modules/search-rules/services/SearchRuleParser";
import { ScopedSearchRuleMatcher } from "@/modules/search-rules/services/ScopedSearchRuleMatcher";
import { ScopedSearchRule } from "@/modules/search-rules/interfaces/ScopedSearchRule";

const parser = new SearchRuleParser();
const createScopedSearchRuleMatcher = (rules: ScopedSearchRule[]) => {
  const instance = new ScopedSearchRuleMatcher(rules);
  return (name: string, scope: number | null) => instance.matches(name, scope);
};

describe("ScopedSearchRuleMatcher.matches", () => {
  const scoped = (value: string, scope: number | null) => ({
    rule: parser.parse(value),
    scope,
  });

  it("applies global rules everywhere and scoped rules only in their scope", () => {
    const matches = createScopedSearchRuleMatcher([
      scoped("sony", null),
      scoped("bosch", 1),
    ]);
    expect(matches("Sony A7", 1)).toBe(true);
    expect(matches("Sony A7", 2)).toBe(true);
    expect(matches("Bosch drill", 1)).toBe(true);
    expect(matches("Bosch drill", 2)).toBe(false);
    expect(matches("Bosch drill", null)).toBe(false);
  });

  it("limits a scoped exclusion-only rule to its scope", () => {
    const matches = createScopedSearchRuleMatcher([
      scoped("sony", null),
      scoped("!etui", 1),
    ]);
    expect(matches("Sony etui", 1)).toBe(false);
    expect(matches("Sony etui", 2)).toBe(true);
  });

  it("matches nothing in a scope without a positive rule", () => {
    expect(
      createScopedSearchRuleMatcher([scoped("bosch", 1)])("Bosch drill", 3)
    ).toBe(false);
  });
});
