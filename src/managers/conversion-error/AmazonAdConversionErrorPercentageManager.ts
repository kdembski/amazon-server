import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { roundToTwoDecimals } from "@/helpers/number";
import { AmazonAdConversionErrorEvaluator } from "@/managers/conversion-error/AmazonAdConversionErrorEvaluator";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { DiscordConversionErrorService } from "@/services/discord/DiscordConversionErrorService";
import { LogService } from "@/services/LogService";
import { StorageService } from "@/services/StorageService";

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

  async check(ad: AmazonAdSelectDto, prices: AmazonAdPriceCreateDto[]) {
    if (this.evaluator.isOverPercentageDifference(prices, 80)) {
      if (await this.evaluator.isHigherThanPrevious(ad, prices)) return;

      await this.logService.creatable.create({
        event: "conversion_error_3_sent",
      });

      this.discordService.setChannel("3");
      this.discordService.send(ad, prices);
      return;
    }

    if (this.evaluator.isOverPercentageDifference(prices, 60)) {
      if (await this.evaluator.isHigherThanPrevious(ad, prices)) return;

      await this.logService.creatable.create({
        event: "conversion_error_2_sent",
      });

      this.discordService.setChannel("2");
      this.discordService.send(ad, prices);
      return;
    }
  }
}
