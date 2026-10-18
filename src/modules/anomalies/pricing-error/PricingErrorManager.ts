import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { PricingErrorReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { PricingErrorEvaluator } from "@/modules/anomalies/pricing-error/PricingErrorEvaluator";

export class PricingErrorManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private evaluator;

  constructor(
    reporter: PricingErrorReporter<T>,
    evaluator = new PricingErrorEvaluator()
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
