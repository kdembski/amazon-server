import { BusinessLogType } from "@prisma/client";

export interface HourlyReportCounts {
  scraped: number;
  comparable: number;
  minPrices: number;
  channels: { name: string; count: number }[];
  priceDrop: { name: string; count: number };
}

export interface TimePoint {
  t: string;
  value: number;
}

export interface ActivitySeries {
  type: BusinessLogType;
  channel: string | null;
  points: TimePoint[];
}

export interface ActivityStatsDto {
  series: ActivitySeries[];
  totals: Record<BusinessLogType, number>;
  previousTotals: Record<BusinessLogType, number>;
}

export type LogLevelCounts = { error: number; warn: number };

export interface LogStatsDto {
  series: { level: "error" | "warn"; points: TimePoint[] }[];
  totals: LogLevelCounts;
  previousTotals: LogLevelCounts;
  topSources: ({ source: string } & LogLevelCounts)[];
}
