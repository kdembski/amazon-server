import { ListingPrice } from "@/modules/anomalies/types/listing-price";
import { CountryOutlierRuleI } from "@/modules/anomalies/interfaces/CountryOutlierRuleI";
import { CountryOutlierEvaluator } from "@/modules/anomalies/country-outlier/CountryOutlierEvaluator";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { CountryOutlierRuleSetting } from "@/modules/settings/types/settings";

export class CountryOutlierRule implements CountryOutlierRuleI {
  readonly channelId;
  readonly dealCheck;
  private setting;
  private minPrices;
  private evaluator;
  private dropEvaluator;

  constructor(
    setting: CountryOutlierRuleSetting,
    globalMinPrices: number,
    evaluator = new CountryOutlierEvaluator(),
    dropEvaluator = new PriceDropEvaluator()
  ) {
    this.channelId = setting.channelId;
    this.dealCheck = setting.dealCheck ?? false;
    this.setting = setting;
    this.minPrices = Math.max(globalMinPrices, setting.minPrices ?? 0);
    this.evaluator = evaluator;
    this.dropEvaluator = dropEvaluator;
  }

  // `prices` are the PLN prices of all countries, cheapest first; `history` is [newest, lowestOlder?] of the
  // cheapest country in its own currency.
  matches(prices: ListingPrice[], history: ListingPrice[]) {
    const { belowMedianPercent, minPln, maxPln, dropPercent } = this.setting;
    return (
      prices.length >= this.minPrices &&
      this.evaluator.isOverPercentageDifference(prices, belowMedianPercent) &&
      this.evaluator.isInRange(prices, minPln, maxPln) &&
      (dropPercent === undefined || this.dropEvaluator.isOverPercentageDifference(history, dropPercent))
    );
  }
}
