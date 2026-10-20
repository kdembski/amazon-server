import { AmazonAdPriceSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AmazonAdListingPriceMapper {
  // Prices of countries outside scrapedCountryIds are only compared with, never reported.
  map(countryPrices: AmazonAdPriceSelectDto[][], scrapedCountryIds: number[]) {
    return countryPrices.map((prices) =>
      prices.map((price) =>
        this.toListingPrice(price, scrapedCountryIds.includes(price.countryId))
      )
    );
  }

  private toListingPrice(
    price: AmazonAdPriceSelectDto,
    scraped: boolean
  ): ListingPrice {
    const { name, code, active, currencyId, currency } = price.country;

    return {
      value: price.value,
      createdAt: price.createdAt,
      reportable: scraped && price.dispatchFrom === "Amazon",
      country: { name, code, active, currencyId, currencyCode: currency.code },
    };
  }
}
