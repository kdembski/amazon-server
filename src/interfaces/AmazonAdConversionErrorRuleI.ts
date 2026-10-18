import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";

export interface AmazonAdConversionErrorRuleI {
  readonly channel: string;
  matches(prices: AmazonAdPriceSelectDto[]): boolean | undefined;
}
