import { AmazonAdPriceSelectDto } from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";

export class AmazonAdListingPriceMapper {
  // Prices of countries outside scrapedCountryIds are only compared with, never reported.
  map(
    asin: string,
    countryPrices: AmazonAdPriceSelectDto[][],
    scrapedCountryIds: number[]
  ) {
    return countryPrices.map((prices) =>
      prices.map((price) =>
        this.toListingPrice(
          price,
          asin,
          scrapedCountryIds.includes(price.countryId)
        )
      )
    );
  }

  private toListingPrice(
    price: AmazonAdPriceSelectDto,
    asin: string,
    scraped: boolean
  ): ListingPrice {
    const { tld, active, country } = price.country;
    const { id, name, code, currencyId, currency } = country;

    return {
      value: price.value,
      createdAt: price.createdAt,
      scraped,
      reportable: scraped && price.dispatchFrom === "Amazon",
      url: `https://www.amazon.${tld}/dp/${asin}`,
      country: { id, name, code, active, currencyId, currencyCode: currency.code },
    };
  }
}
