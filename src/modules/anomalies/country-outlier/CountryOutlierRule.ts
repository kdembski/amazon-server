import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { CountryOutlierRuleSetting } from "@/modules/settings/interfaces/Settings";

export class CountryOutlierRule implements CountryOutlierRuleI {
  readonly channelId;
  readonly dropSinceSentPercent;
  private setting;
  private evaluator;

  constructor(
    setting: CountryOutlierRuleSetting,
    defaultDropSinceSentPercent: number,
    evaluator = new CountryOutlierEvaluator()
  ) {
    this.channelId = setting.channelId;
    this.dropSinceSentPercent = setting.dropSinceSentPercent ?? defaultDropSinceSentPercent;
    this.setting = setting;
    this.evaluator = evaluator;
  }

  matches(prices: ListingPrice[]) {
    const { belowMedianPercent, minPln, maxPln } = this.setting;
    return (
      this.evaluator.isOverPercentageDifference(prices, belowMedianPercent) &&
      this.evaluator.isInRange(prices, minPln, maxPln)
    );
  }
}
