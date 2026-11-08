import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";

export const HOUR_MS = 3_600_000;

export function floorHour(date: Date) {
  return new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
}

export function toHourIso(epochSeconds: number | bigint) {
  return new Date(Number(epochSeconds) * 1000).toISOString();
}

// The range of the same length right before `range`
export function previousRange({ from, to }: TimeRange): TimeRange {
  return { from: new Date(2 * from.getTime() - to.getTime()), to: from };
}
