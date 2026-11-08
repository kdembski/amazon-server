import { AnomalyManagerI } from "@/modules/anomalies/interfaces/AnomalyManagerI";
import { ListingPrice } from "@/modules/anomalies/interfaces/ListingPrice";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { LogThrottle } from "@/shared/logging/services/LogThrottle";
import { ConcurrencyQueue } from "@/shared/utils/ConcurrencyQueue";

const CONCURRENCY = 40;
const LAG_MS = 60_000;
const LAG_WARNING_INTERVAL_MS = 60_000;

// Runs the anomaly checks of stored prices in the background, at most CONCURRENCY at once
export class AnomalyCheckQueue<T> {
  private manager;
  private queue;
  private logger;
  private lagThrottle = new LogThrottle(LAG_WARNING_INTERVAL_MS);

  constructor(
    manager: AnomalyManagerI<T>,
    queue = new ConcurrencyQueue(CONCURRENCY),
    logger = SystemLogService.getInstance()
  ) {
    this.manager = manager;
    this.queue = queue;
    this.logger = logger;
  }

  get size() {
    return this.queue.size;
  }

  // `getPrices` runs when the check starts; `context` identifies the listing in the error log
  add(listing: T, getPrices: () => Promise<ListingPrice[][]>, context: Record<string, unknown>) {
    this.queue.add((waitedMs) => {
      this.warnIfLagging(waitedMs);
      return this.check(listing, getPrices, context);
    });
  }

  private async check(listing: T, getPrices: () => Promise<ListingPrice[][]>, context: Record<string, unknown>) {
    try {
      await this.manager.check(listing, await getPrices());
    } catch (error) {
      this.logger.error("AnomalyCheckQueue", "Anomaly check failed", { error, ...context });
    }
  }

  private warnIfLagging(waitedMs: number) {
    if (waitedMs < LAG_MS || !this.lagThrottle.shouldLog()) return;

    this.logger.warn(
      "AnomalyCheckQueue",
      `Anomaly checks run ${Math.round(waitedMs / 1000)} s after the prices were stored`,
      { waitedMs, queuedAnomalyChecks: this.queue.size }
    );
  }
}
