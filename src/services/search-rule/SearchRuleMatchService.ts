import { AmazonAdRepository } from "@/repositories/amazon/AmazonAdRepository";
import { SearchRuleService } from "@/services/search-rule/SearchRuleService";

export class SearchRuleMatchService {
  private searchRuleService;
  private adRepository;
  private fingerprint?: string;
  private isRunning = false;

  constructor(
    searchRuleService = new SearchRuleService(),
    adRepository = new AmazonAdRepository()
  ) {
    this.searchRuleService = searchRuleService;
    this.adRepository = adRepository;
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

      const { matched, unmatched } = await this.adRepository.matchSearchRules(
        searchRules,
        !changed
      );
      this.fingerprint = fingerprint;

      if (changed) {
        console.log(
          `SearchRuleMatchService: ${searchRules.length} search rules matched ${matched} and unmatched ${unmatched} ads in ${Date.now() - startedAt} ms`
        );
      }
    } finally {
      this.isRunning = false;
    }
  }
}
