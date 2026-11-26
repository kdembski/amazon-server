import { ActivityCount } from "@/modules/monitoring/types/activity-count";

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
