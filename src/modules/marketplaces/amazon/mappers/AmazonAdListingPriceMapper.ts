import { AmazonAdPriceSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AmazonAdListingPriceMapper {
  map(countryPrices: AmazonAdPriceSelectDto[][]) {
    return countryPrices.map((prices) =>
      prices.map((price) => this.toListingPrice(price))
    );
  }

  private toListingPrice(price: AmazonAdPriceSelectDto): ListingPrice {
    const { name, code, active, currencyId, currency } = price.country;

    return {
      value: price.value,
      createdAt: price.createdAt,
      reportable: price.dispatchFrom === "Amazon",
      country: { name, code, active, currencyId, currencyCode: currency.code },
    };
  }
}
