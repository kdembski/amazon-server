import { describe, expect, it } from "vitest";
import { ExclusionRuleParser } from "@/modules/exclusion-rules/services/ExclusionRuleParser";
import { ScopedExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ScopedExclusionRuleMatcher";
import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";

const parser = new ExclusionRuleParser();
const createScopedExclusionRuleMatcher = (rules: ScopedExclusionRule[]) => {
  const instance = new ScopedExclusionRuleMatcher(rules);
  return (name: string, scope: number | null) => instance.excludes(name, scope);
};

describe("ScopedExclusionRuleMatcher.excludes", () => {
  const scoped = (value: string, scope: number | null, inverted = false) => ({
    rule: parser.parse(value),
    scope,
    inverted,
  });

  it("keeps only names matching an inverted rule of the scope", () => {
    const matches = createScopedExclusionRuleMatcher([
      scoped("rtx + 4090|5090", 1, true),
      scoped("kabel", 1),
      scoped("sony", null),
    ]);
    expect(matches("RTX 4090 Gaming", 1)).toBe(false);
    expect(matches("RTX 4080 Gaming", 1)).toBe(true);
    expect(matches("RTX 5090 Kabel", 1)).toBe(true);
    expect(matches("Sony RTX 4090", 1)).toBe(true);
    expect(matches("RTX 4080 Gaming", 2)).toBe(false);
    expect(matches("RTX 4080 Gaming", null)).toBe(false);
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

  it("excludes nothing in a scope without rules", () => {
    expect(
      createScopedExclusionRuleMatcher([scoped("bosch", 1)])("Bosch drill", 3)
    ).toBe(false);
  });
});
