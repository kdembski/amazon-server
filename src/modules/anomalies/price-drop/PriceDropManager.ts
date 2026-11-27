import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { PriceDropReporterI } from "@/modules/anomalies/interfaces/PriceDropReporterI";
import { ListingPrice } from "@/modules/anomalies/types/listing-price";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { PriceDropRuleMatcher } from "@/modules/anomalies/price-drop/PriceDropRuleMatcher";

export class PriceDropManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private evaluator;
  private ruleMatcher;

  constructor(
    reporter: PriceDropReporterI<T>,
    evaluator = new PriceDropEvaluator(),
    ruleMatcher = new PriceDropRuleMatcher()
  ) {
    this.reporter = reporter;
    this.evaluator = evaluator;
    this.ruleMatcher = ruleMatcher;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    const reportable = countryPrices.filter((prices) => this.evaluator.isReportable(prices));
    if (!reportable.length) return;

    const matches = await this.ruleMatcher.getMatches(reportable);
    for (const { channelId, dealCheck } of matches.channels) {
      if (dealCheck) await this.reporter.checkDeal(listing, matches.countryPrices, channelId);
      else await this.reporter.report(listing, matches.countryPrices, channelId);
    }
  }
}
