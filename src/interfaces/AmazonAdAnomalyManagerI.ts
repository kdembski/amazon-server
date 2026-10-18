import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";

export interface AmazonAdAnomalyManagerI {
  check(
    ad: AmazonAdSelectDto,
    countryPrices: AmazonAdPriceSelectDto[][]
  ): Promise<void>;
}
