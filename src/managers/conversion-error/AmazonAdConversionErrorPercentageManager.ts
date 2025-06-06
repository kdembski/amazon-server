import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";

export class AmazonAdConversionErrorPercentageManager {
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
    if (this.evaluator.isOverPercentageDifference(prices, 90)) {
      await this.logService.creatable.create({
        event: "conversion_error_3_sent",
      });

      this.discordService.setChannel("3");
      this.discordService.send(ad, prices);
      return;
    }

    if (this.evaluator.isOverPercentageDifference(prices, 70)) {
      await this.logService.creatable.create({
        event: "conversion_error_2_sent",
      });

      this.discordService.setChannel("2");
      this.discordService.send(ad, prices);
      return;
    }

    if (this.evaluator.isOverPercentageDifference(prices, 50)) {
      await this.logService.creatable.create({
        event: "conversion_error_1_sent",
      });

      this.discordService.setChannel("1");
      this.discordService.send(ad, prices);
      return;
    }
  }
}
