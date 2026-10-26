import { ActivityEventType } from "@prisma/client";

export interface TimePoint {
  t: string;
  value: number;
}

export interface ActivitySeries {
  type: ActivityEventType;
  channel: string | null;
  points: TimePoint[];
}

export interface ActivityStatsDto {
  series: ActivitySeries[];
  totals: Record<ActivityEventType, number>;
  previousTotals: Record<ActivityEventType, number>;
}

export type LogLevelCounts = { error: number; warn: number };

export interface LogStatsDto {
  series: { level: "error" | "warn"; points: TimePoint[] }[];
  totals: LogLevelCounts;
  previousTotals: LogLevelCounts;
  topSources: ({ source: string } & LogLevelCounts)[];
}
