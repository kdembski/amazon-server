import { ActivityEventType, Marketplace } from "@prisma/client";

export type ActivityCount = { type: ActivityEventType; marketplace: Marketplace; count: number };

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
