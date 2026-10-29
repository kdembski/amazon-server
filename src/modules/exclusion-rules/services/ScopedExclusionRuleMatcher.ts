import { ScopedExclusionRule } from "@/modules/exclusion-rules/interfaces/ScopedExclusionRule";
import { ExclusionRuleMatcher } from "@/modules/exclusion-rules/services/ExclusionRuleMatcher";

type ScopeMatchers = {
  excluding: ExclusionRuleMatcher;
  inverted: ExclusionRuleMatcher | null;
};

export class ScopedExclusionRuleMatcher {
  private rules;
  private matchers = new Map<number | null, ScopeMatchers>();

  constructor(rules: ScopedExclusionRule[]) {
    this.rules = rules;
  }

  // A scope with inverted rules keeps only names matching one of them.
  excludes(name: string, scope: number | null) {
    const { excluding, inverted } = this.getMatchers(scope);
    return (
      excluding.excludes(name) || (inverted !== null && !inverted.excludes(name))
    );
  }

  private getMatchers(scope: number | null) {
    let matchers = this.matchers.get(scope);
    if (!matchers) {
      const inverted = this.rules
        .filter((rule) => rule.inverted && rule.scope === scope)
        .map((rule) => rule.rule);
      matchers = {
        excluding: new ExclusionRuleMatcher(
          this.rules
            .filter(
              (rule) =>
                !rule.inverted && (rule.scope === null || rule.scope === scope)
            )
            .map((rule) => rule.rule)
        ),
        inverted: inverted.length ? new ExclusionRuleMatcher(inverted) : null,
      };
      this.matchers.set(scope, matchers);
    }
    return matchers;
  }
}
