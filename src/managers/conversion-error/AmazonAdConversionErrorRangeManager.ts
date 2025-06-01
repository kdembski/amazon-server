import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";

export class AmazonAdConversionErrorRangeManager {
  private evaluator;
  private logService;
  private discordService;

  constructor(
    evaluator = new AmazonAdConversionErrorEvaluator(),
    logService = new LogService(),
    discordService = new DiscordConversionErrorService()
  ) {
    this.evaluator = evaluator;
    this.logService = logService;
    this.discordService = discordService;
  }

  async check(ad: AmazonAdSelectDto, prices: AmazonAdPriceSelectDto[]) {
    if (!this.evaluator.isOverPercentageDifference(prices, 70)) return;

    if (this.evaluator.isInRange(prices, 0, 50)) {
      await this.logService.creatable.create({
        event: "conversion_error_4_sent",
      });

      this.discordService.setChannel("4");
      this.discordService.send(ad, prices);
      return;
    }

    if (this.evaluator.isInRange(prices, 50, 200)) {
      await this.logService.creatable.create({
        event: "conversion_error_5_sent",
      });

      this.discordService.setChannel("5");
      this.discordService.send(ad, prices);
      return;
    }

    if (this.evaluator.isInRange(prices, 200)) {
      await this.logService.creatable.create({
        event: "conversion_error_6_sent",
      });

      this.discordService.setChannel("6");
      this.discordService.send(ad, prices);
      return;
    }
  }
}
