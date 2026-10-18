import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";
import { AmazonAdPriceSelectDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { Listing, ListingPrice } from "@/modules/anomalies/interfaces/Listing";

export class AmazonAdListingMapper {
  map(ad: AmazonAdSelectDto, countryPrices: AmazonAdPriceSelectDto[][]) {
    return {
      listing: this.toListing(ad),
      countryPrices: countryPrices.map((prices) =>
        prices.map((price) => this.toListingPrice(price))
      ),
    };
  }

  private toListing(ad: AmazonAdSelectDto): Listing {
    return {
      name: ad.name,
      externalId: ad.asin,
      image: ad.image,
      categoryName: ad.category.name,
      getUrl: (code) => `https://www.amazon.${code}/dp/${ad.asin}`,
    };
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
