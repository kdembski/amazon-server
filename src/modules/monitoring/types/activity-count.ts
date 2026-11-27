import { BusinessLogType, Marketplace } from "@prisma/client";

// prices: number of countries of one item's prices -> items; countries: countryId -> items
export interface ActivityCount {
  type: BusinessLogType;
  marketplace: Marketplace;
  count: number;
  prices: Record<string, number>;
  countries: Record<string, number>;
}
