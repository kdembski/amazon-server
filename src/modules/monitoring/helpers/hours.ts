import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";

export const HOUR_MS = 3_600_000;

export const floorHour = (date: Date) => new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);

export const toHourIso = (epochSeconds: number | bigint) => new Date(Number(epochSeconds) * 1000).toISOString();

// The range of the same length right before `range`
export const previousRange = ({ from, to }: TimeRange): TimeRange => {
  return { from: new Date(2 * from.getTime() - to.getTime()), to: from };
};
