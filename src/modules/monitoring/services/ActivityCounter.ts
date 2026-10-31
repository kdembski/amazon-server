import { BusinessLogType, Marketplace } from "@prisma/client";

// prices: number of countries of one item's prices -> items; countries: countryId -> items
export type ActivityCount = {
  type: BusinessLogType;
  marketplace: Marketplace;
  count: number;
  prices: Record<string, number>;
  countries: Record<string, number>;
};

export class ActivityCounter {
  private static instance: ActivityCounter;
  // Keyed by `${type}:${marketplace}`
  counts = new Map<string, ActivityCount>();

  private constructor() {}

  public static getInstance(): ActivityCounter {
    if (!ActivityCounter.instance) {
      ActivityCounter.instance = new ActivityCounter();
    }

    return ActivityCounter.instance;
  }
}
