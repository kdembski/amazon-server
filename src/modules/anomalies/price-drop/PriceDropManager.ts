import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { PriceDropReporter } from "@/modules/anomalies/interfaces/AnomalyReporters";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { PriceDropEvaluator } from "@/modules/anomalies/price-drop/PriceDropEvaluator";
import { SettingService } from "@/modules/settings/services/SettingService";

export class PriceDropManager<T> implements AnomalyManagerI<T> {
  private reporter;
  private evaluator;
  private settingService;

  constructor(
    reporter: PriceDropReporter<T>,
    evaluator = new PriceDropEvaluator(),
    settingService = new SettingService()
  ) {
    this.reporter = reporter;
    this.evaluator = evaluator;
    this.settingService = settingService;
  }

  async check(listing: T, countryPrices: ListingPrice[][]) {
    const dropPercent = await this.settingService.get("priceDrop.dropPercent");
    const countryPricesToSend = countryPrices.filter(
      (prices) =>
        this.evaluator.isOverPercentageDifference(prices, dropPercent) &&
        this.evaluator.isReportable(prices)
    );

    if (!countryPricesToSend.length) return;

    await this.reporter.report(listing, countryPricesToSend);
  }
}
