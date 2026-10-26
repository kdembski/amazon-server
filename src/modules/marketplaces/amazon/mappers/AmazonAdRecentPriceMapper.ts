import {
  AmazonAdPriceSelectDto,
  AmazonAdRecentPriceRow,
} from "@/modules/marketplaces/amazon/dtos/AmazonAdPriceDtos";

export class AmazonAdRecentPriceMapper {
  // Groups keep the order of each country's newest price; prices inside a group keep the row order
  toCountryGroups(rows: AmazonAdRecentPriceRow[]) {
    const countryPrices = new Map<number, AmazonAdPriceSelectDto[]>();
    for (const row of rows) {
      const group = countryPrices.get(row.countryId) ?? [];
      countryPrices.set(row.countryId, [...group, this.toPrice(row)]);
    }
    return [...countryPrices.values()];
  }

  private toPrice(row: AmazonAdRecentPriceRow): AmazonAdPriceSelectDto {
    return {
      id: row.id,
      adId: row.adId,
      countryId: row.countryId,
      value: row.value,
      dispatchFrom: row.dispatchFrom,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      country: {
        tld: row.tld,
        active: Boolean(row.active),
        country: {
          id: row.countryId,
          name: row.countryName,
          code: row.countryCode,
          currencyId: row.currencyId,
          currency: {
            id: row.currencyId,
            name: row.currencyName,
            code: row.currencyCode,
            symbol: row.currencySymbol,
            createdAt: row.currencyCreatedAt,
            updatedAt: row.currencyUpdatedAt,
          },
        },
      },
    };
  }
}
