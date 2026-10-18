import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdAnomalyManagerI } from "@/interfaces/AmazonAdAnomalyManagerI";
import { AmazonAdConversionErrorManager } from "@/managers/conversion-error/AmazonAdConversionErrorManager";
import { AmazonAdPricingErrorManager } from "@/managers/pricing-error/AmazonAdPricingErrorManager";

export class AmazonAdAnomalyManager implements AmazonAdAnomalyManagerI {
  private managers: AmazonAdAnomalyManagerI[];

  constructor(
    conversionErrorManager = new AmazonAdConversionErrorManager(),
    pricingErrorManager = new AmazonAdPricingErrorManager()
  ) {
    this.managers = [conversionErrorManager, pricingErrorManager];
  }

  async check(
    ad: AmazonAdSelectDto,
    countryPrices: AmazonAdPriceSelectDto[][]
  ) {
    const results = await Promise.allSettled(
      this.managers.map((manager) => manager.check(ad, countryPrices))
    );

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error(`AmazonAdAnomalyManager: ${result.reason}`);
      }
    });
  }
}
