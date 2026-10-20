import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";

export class ScopedExclusionRuleMatcher {
  private rules;
  private matchers = new Map<number | null, ExclusionRuleMatcher>();

  constructor(rules: ScopedExclusionRule[]) {
    this.rules = rules;
  }

  matches(name: string, scope: number | null) {
    return this.getMatcher(scope).matches(name);
  }

  private getMatcher(scope: number | null) {
    let matcher = this.matchers.get(scope);
    if (!matcher) {
      matcher = new ExclusionRuleMatcher(
        this.rules
          .filter((rule) => rule.scope === null || rule.scope === scope)
          .map((rule) => rule.rule)
      );
      this.matchers.set(scope, matcher);
    }
    return matcher;
  }
}
