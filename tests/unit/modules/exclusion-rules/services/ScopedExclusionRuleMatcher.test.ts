import { describe, expect, it } from "vitest";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";
import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";

const parser = new ExclusionRuleParser();
const createScopedExclusionRuleMatcher = (rules: ScopedExclusionRule[]) => {
  const instance = new ScopedExclusionRuleMatcher(rules);
  return (name: string, scope: number | null) => instance.matches(name, scope);
};

describe("ScopedExclusionRuleMatcher.matches", () => {
  const scoped = (value: string, scope: number | null) => ({
    rule: parser.parse(value),
    scope,
  });

  it("applies global rules everywhere and scoped rules only in their scope", () => {
    const matches = createScopedExclusionRuleMatcher([
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
    const matches = createScopedExclusionRuleMatcher([
      scoped("sony", null),
      scoped("!etui", 1),
    ]);
    expect(matches("Sony etui", 1)).toBe(false);
    expect(matches("Sony etui", 2)).toBe(true);
  });

  it("matches nothing in a scope without a positive rule", () => {
    expect(
      createScopedExclusionRuleMatcher([scoped("bosch", 1)])("Bosch drill", 3)
    ).toBe(false);
  });
});
