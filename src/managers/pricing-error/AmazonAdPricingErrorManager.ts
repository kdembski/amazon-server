import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdAnomalyManagerI } from "@/interfaces/AmazonAdAnomalyManagerI";
import { AmazonAdPricingErrorEvaluator } from "@/managers/pricing-error/AmazonAdPricingErrorEvaluator";
import { DiscordPricingErrorService } from "@/services/discord/DiscordPricingErrorService";
import { LogService } from "@/modules/monitoring/services/LogService";

export class AmazonAdPricingErrorManager implements AmazonAdAnomalyManagerI {
  private discordService;
  private logService;
  private evaluator;

  constructor(
    discordService = new DiscordPricingErrorService(),
    logService = new LogService(),
    evaluator = new AmazonAdPricingErrorEvaluator()
  ) {
    this.discordService = discordService;
    this.logService = logService;
    this.evaluator = evaluator;
  }

  async check(
    ad: AmazonAdSelectDto,
    countryPrices: AmazonAdPriceSelectDto[][]
  ) {
    const countryPricesToSend = countryPrices.filter(
      (prices) =>
        this.evaluator.isOverPercentageDifference(prices) &&
        this.evaluator.isReportable(prices)
    );

    if (!countryPricesToSend.length) return;

    await this.logService.creatable.create({ event: "pricing_error_sent" });
    this.discordService.send(ad, countryPricesToSend);
  }
}
