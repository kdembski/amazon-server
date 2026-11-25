import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleI, IsBelowReported } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { CountryOutlierRuleSetting } from "@/modules/settings/interfaces/Settings";

export class CountryOutlierRule implements CountryOutlierRuleI {
  readonly channelId;
  readonly dropSinceSentPercent;
  readonly dealCheck;
  readonly requireSent;
  private setting;
  private minPrices;
  private evaluator;

  constructor(
    setting: CountryOutlierRuleSetting,
    defaultDropSinceSentPercent: number,
    globalMinPrices: number,
    evaluator = new CountryOutlierEvaluator()
  ) {
    this.channelId = setting.channelId;
    this.dropSinceSentPercent = setting.dropSinceSentPercent ?? defaultDropSinceSentPercent;
    this.dealCheck = setting.dealCheck ?? false;
    this.requireSent = setting.requireSent ?? false;
    this.setting = setting;
    this.minPrices = Math.max(globalMinPrices, setting.minPrices ?? 0);
    this.evaluator = evaluator;
  }

  // `isBelowReported` is missing without a reported price: a rule then matches unless it has requireSent, which
  // makes the group fall through to its next rule on the first alert of a listing.
  matches(prices: ListingPrice[], isBelowReported?: IsBelowReported) {
    const { belowMedianPercent, minPln, maxPln } = this.setting;
    return (
      prices.length >= this.minPrices &&
      this.evaluator.isOverPercentageDifference(prices, belowMedianPercent) &&
      this.evaluator.isInRange(prices, minPln, maxPln) &&
      (isBelowReported?.(this.dropSinceSentPercent) ?? !this.requireSent)
    );
  }
}
