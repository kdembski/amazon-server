import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import {
  ScopedSearchRule,
  createScopedSearchRuleMatcher,
  parseSearchRule,
} from "@/modules/search-rules/helpers/searchRule";

export class SearchRuleMatchService {
  private targets;
  private fingerprints = new Map<SearchRuleTarget, string>();
  private isRunning = false;

  constructor(targets: SearchRuleTarget[]) {
    this.targets = targets;
  }

  // Rematches every ad of a target when its rules differ from the last
  // successful run, otherwise only the ads that were never checked.
  async sync() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      for (const target of this.targets) {
        await this.syncTarget(target);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async syncTarget(target: SearchRuleTarget) {
    const searchRules = await target.getSearchRules();
    const fingerprint = searchRules
      .map((rule) => `${rule.scope ?? ""}\t${rule.value}`)
      .sort()
      .join("\n");
    const changed = fingerprint !== this.fingerprints.get(target);
    const startedAt = Date.now();
    const matches = createScopedSearchRuleMatcher(
      this.parseSearchRules(searchRules)
    );

    const { matched, unmatched } = await target.matchSearchRules(
      matches,
      !changed
    );
    this.fingerprints.set(target, fingerprint);

    if (changed) {
      console.log(
        `SearchRuleMatchService: ${searchRules.length} search rules matched ${matched} and unmatched ${unmatched} ads in ${Date.now() - startedAt} ms`
      );
    }
  }

  private parseSearchRules(
    rules: { value: string; scope: number | null }[]
  ): ScopedSearchRule[] {
    return rules.flatMap(({ value, scope }) => {
      try {
        return [{ rule: parseSearchRule(value), scope }];
      } catch (e) {
        console.error(
          `SearchRuleMatchService: skipped search rule ${value}: ${e}`
        );
        return [];
      }
    });
  }
}
