import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";
import { PricingErrorEvaluator } from "@/modules/anomalies/pricing-error/PricingErrorEvaluator";
import { DiscordPricingErrorService } from "@/modules/anomalies/pricing-error/DiscordPricingErrorService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class PricingErrorManager implements AnomalyManagerI {
  private discordService;
  private logService;
  private evaluator;

  constructor(
    discordService = new DiscordPricingErrorService(),
    logService = new LogService(),
    evaluator = new PricingErrorEvaluator()
  ) {
    this.discordService = discordService;
    this.logService = logService;
    this.evaluator = evaluator;
  }

  async check(listing: Listing, countryPrices: ListingPrice[][]) {
    const countryPricesToSend = countryPrices.filter(
      (prices) =>
        this.evaluator.isOverPercentageDifference(prices) &&
        this.evaluator.isReportable(prices)
    );

    if (!countryPricesToSend.length) return;

    await this.logService.creatable.create({ event: "pricing_error_sent" });
    this.discordService.send(listing, countryPricesToSend);
  }
}
