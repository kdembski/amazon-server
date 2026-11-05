import { TimeRange } from "@/modules/monitoring/helpers/parseTimeRange";

export const HOUR_MS = 3_600_000;

export interface RangePart extends TimeRange {
  hourly: boolean;
}

export function floorHour(date: Date) {
  return new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
}

// Whole hours before rolledUpUntil come from the hourly sums, the partial hours at the edges from raw rows
export function splitByRollup({ from, to }: TimeRange, rolledUpUntil: Date | null): RangePart[] {
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
