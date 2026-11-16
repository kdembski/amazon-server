import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { SettingService } from "@/modules/settings/services/SettingService";

export class PriceDropRuleMatcher {
  private settingService;
  private evaluator;

  constructor(settingService = new SettingService(), evaluator = new PriceDropEvaluator()) {
    this.settingService = settingService;
    this.evaluator = evaluator;
  }

  // Each group takes its first matching rule per country; returns the countries that matched any rule
  // and the distinct channels of the matched rules.
  async getMatches(countryPrices: ListingPrice[][]) {
    const groups = await this.settingService.get("priceDrop.ruleGroups");
    const matchedCountries: ListingPrice[][] = [];
    const channelIds = new Set<number>();

    for (const prices of countryPrices) {
      const rules = (groups ?? []).flatMap((group) => {
        const rule = group.find(({ dropPercent }) => {
          return this.evaluator.isOverPercentageDifference(prices, dropPercent);
        });
        return rule ? [rule] : [];
      });
      if (!rules.length) continue;

      matchedCountries.push(prices);
      rules.forEach((rule) => channelIds.add(rule.channelId));
    }

    return { countryPrices: matchedCountries, channelIds: [...channelIds] };
  }
}
