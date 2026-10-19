import { ScopedSearchRule } from "@/modules/search-rules/interfaces/ScopedSearchRule";
import { SearchRuleMatcher } from "@/modules/search-rules/services/SearchRuleMatcher";

export class ScopedSearchRuleMatcher {
  private rules;
  private matchers = new Map<number | null, SearchRuleMatcher>();

  constructor(rules: ScopedSearchRule[]) {
    this.rules = rules;
  }

  matches(name: string, scope: number | null) {
    return this.getMatcher(scope).matches(name);
  }

  private getMatcher(scope: number | null) {
    let matcher = this.matchers.get(scope);
    if (!matcher) {
      matcher = new SearchRuleMatcher(
        this.rules
          .filter((rule) => rule.scope === null || rule.scope === scope)
          .map((rule) => rule.rule)
      );
      this.matchers.set(scope, matcher);
    }
    return matcher;
  }
}
