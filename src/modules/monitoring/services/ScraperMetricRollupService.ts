import { floorHour, HOUR_MS } from "@/modules/monitoring/helpers/hours";
import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";

// shortcut: metrics of an hour that arrive later than this are missing from its hourly sums; re-roll the hour if scrapers start sending late
const ROLLUP_DELAY_MS = 5 * 60_000;

export interface RangePart extends TimeRange {
  hourly: boolean;
}

export class ScraperMetricRollupService {
  private repository;

  constructor(repository = new ScraperMetricRepository()) {
    this.repository = repository;
  }

  getRolledUpUntil() {
    return this.repository.getRolledUpUntil();
  }

  // Rolls up every finished hour after the newest rolled-up one; returns the number of hours
  async rollUp(now: Date) {
    const end = floorHour(new Date(now.getTime() - ROLLUP_DELAY_MS));
    const oldest = await this.repository.getOldestPeriodStart();
    const start = (await this.repository.getRolledUpUntil()) ?? (oldest && floorHour(oldest));
    if (!start) {
      return 0;
    }

    let hours = 0;
    for (let hour = start; hour < end; hour = new Date(hour.getTime() + HOUR_MS)) {
      await this.repository.rollUpHour(hour);
      hours++;
    }
    return hours;
  }

  // The parts do not overlap, so concatenated sums add up like one query over the range
  async sumParts<T>(range: TimeRange, rolledUpUntil: Date | null, read: (part: RangePart) => Promise<T[]>) {
    const parts = await Promise.all(this.getParts(range, rolledUpUntil).map(read));
    return parts.flat();
  }

  // Whole hours before rolledUpUntil come from the hourly sums, the partial hours at the edges from raw rows
  getParts({ from, to }: TimeRange, rolledUpUntil: Date | null): RangePart[] {
    const start = new Date(Math.ceil(from.getTime() / HOUR_MS) * HOUR_MS);
    const end = new Date(Math.min(floorHour(to).getTime(), rolledUpUntil?.getTime() ?? 0));
    if (end <= start) {
      return [{ from, to, hourly: false }];
    }

    return [
      { from, to: start, hourly: false },
      { from: start, to: end, hourly: true },
      { from: end, to, hourly: false },
    ].filter((part) => part.from < part.to);
  }
}
