import { SearchRuleService } from "@/modules/search-rules/services/SearchRuleService";
import { SearchRuleTarget } from "@/modules/search-rules/interfaces/SearchRuleTarget";
import {
  createSearchRuleMatcher,
  parseSearchRule,
} from "@/modules/search-rules/helpers/searchRule";

export class SearchRuleMatchService {
  private targets;
  private searchRuleService;
  private fingerprint?: string;
  private isRunning = false;

  constructor(
    targets: SearchRuleTarget[],
    searchRuleService = new SearchRuleService()
  ) {
    this.targets = targets;
    this.searchRuleService = searchRuleService;
  }

  // Rematches every ad when the rules differ from the last successful run,
  // otherwise only the ads that were never checked.
  async sync() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const searchRules = await this.searchRuleService.getAll();
      const fingerprint = searchRules
        .map((rule) => rule.value)
        .sort()
        .join("\n");
      const changed = fingerprint !== this.fingerprint;
      const startedAt = Date.now();
      const matches = createSearchRuleMatcher(
        this.parseSearchRules(searchRules.map((rule) => rule.value))
      );

      const total = { matched: 0, unmatched: 0 };
      for (const target of this.targets) {
        const { matched, unmatched } = await target.matchSearchRules(
          matches,
          !changed
        );
        total.matched += matched;
        total.unmatched += unmatched;
      }
      this.fingerprint = fingerprint;

      if (changed) {
        console.log(
          `SearchRuleMatchService: ${searchRules.length} search rules matched ${total.matched} and unmatched ${total.unmatched} ads in ${Date.now() - startedAt} ms`
        );
      }
    } finally {
      this.isRunning = false;
    }
  }

  private parseSearchRules(values: string[]) {
    return values.flatMap((value) => {
      try {
        return [parseSearchRule(value)];
      } catch (e) {
        console.error(
          `SearchRuleMatchService: skipped search rule ${value}: ${e}`
        );
        return [];
      }
    });
  }
}
