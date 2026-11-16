import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { PriceDropRuleMatcher } from "@/modules/anomalies/price-drop/PriceDropRuleMatcher";

export class PriceDropManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private evaluator;
  private ruleMatcher;

  constructor(
    reporter: PriceDropReporter<T>,
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
    for (const channelId of matches.channelIds) {
      await this.reporter.report(listing, matches.countryPrices, channelId);
    }
  }
}
