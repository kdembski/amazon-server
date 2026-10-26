import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";

export class PriceDropManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private evaluator;

  constructor(
    reporter: PriceDropReporter<T>,
    evaluator = new PriceDropEvaluator()
  ) {
    this.reporter = reporter;
    this.evaluator = evaluator;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    const countryPricesToSend = countryPrices.filter(
      (prices) =>
        this.evaluator.isOverPercentageDifference(prices) &&
        this.evaluator.isReportable(prices)
    );

    if (!countryPricesToSend.length) return;

    await this.reporter.report(listing, countryPricesToSend);
  }
}
