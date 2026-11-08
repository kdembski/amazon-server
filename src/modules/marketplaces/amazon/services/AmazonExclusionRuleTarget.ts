import { setImmediate } from "node:timers/promises";
import { Marketplace, Prisma } from "@prisma/client";
import { ExclusionRuleTarget } from "@/modules/exclusion-rules/interfaces/ExclusionRuleTarget";
import { AmazonAdCategoryRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdCategoryRepository";
import { AmazonAdRepository } from "@/modules/marketplaces/amazon/repositories/AmazonAdRepository";
import { AmazonExclusionRuleRepository } from "@/modules/marketplaces/amazon/repositories/AmazonExclusionRuleRepository";

const MATCH_YIELD_EVERY = 100;

// Amazon ads matched against their category's exclusion rules; the scope of an ad is its category
export class AmazonExclusionRuleTarget implements ExclusionRuleTarget {
  readonly marketplace = Marketplace.amazon;
  private adRepository;
  private ruleRepository;
  private categoryRepository;
  private matchBatchSize;

  constructor(
    adRepository = new AmazonAdRepository(),
    ruleRepository = new AmazonExclusionRuleRepository(),
    categoryRepository = new AmazonAdCategoryRepository(),
    matchBatchSize = 5_000
  ) {
    this.adRepository = adRepository;
    this.ruleRepository = ruleRepository;
    this.categoryRepository = categoryRepository;
    this.matchBatchSize = matchBatchSize;
  }

  async getExclusionRules() {
    const rules = await this.ruleRepository.getAll();
    return rules.map((rule) => ({ value: rule.value, scope: rule.categoryId, inverted: rule.inverted }));
  }

  getActiveScopes() {
    return this.categoryRepository.getActiveIds();
  }

  // Ads with excluded = null have not been checked yet; only = "new" limits
  // the check to them. A full rematch walks the table in id ranges so each UPDATE
  // commits quickly and only briefly locks the rows /scrap stamps.
  async matchExclusionRules(isExcluded: (name: string, scope: number | null) => boolean, only?: "new" | number[]) {
    if (only === "new") {
      return this.updateMatches(isExcluded, { excluded: null });
    }

    const where = only ? { categoryId: { in: only } } : {};
    const maxId = await this.adRepository.getMaxId(where);
    const total = { excluded: 0, included: 0, scanned: 0 };

    for (let lastId = 0; lastId < maxId; lastId += this.matchBatchSize) {
      const result = await this.updateMatches(isExcluded, {
        ...where,
        id: { gt: lastId, lte: lastId + this.matchBatchSize },
      });
      total.excluded += result.excluded;
      total.included += result.included;
      total.scanned += result.scanned;
    }

    return total;
  }

  // Includes ads before excluding the rest, so the scraping queue never runs
  // empty in between.
  private async updateMatches(
    isExcluded: (name: string, scope: number | null) => boolean,
    where: Prisma.AmazonAdWhereInput
  ) {
    const ads = await this.adRepository.getForMatch(where);
    const excluded: number[] = [];
    const included: number[] = [];

    for (const [index, ad] of ads.entries()) {
      // Matching is synchronous; yield so requests are not blocked for a whole batch
      if (index % MATCH_YIELD_EVERY === 0) await setImmediate();
      const excludes = isExcluded(ad.name, ad.categoryId);
      if (excludes && ad.excluded !== true) excluded.push(ad.id);
      if (!excludes && ad.excluded !== false) included.push(ad.id);
    }

    const includedCount = await this.adRepository.setExcluded(included, false);
    return {
      excluded: await this.adRepository.setExcluded(excluded, true),
      included: includedCount,
      scanned: ads.length,
    };
  }
}
