import { BusinessLogType } from "@prisma/client";

export interface HourlyReportCounts {
  scraped: number;
  // without the countryOutlier.minPrices setting
  comparable?: number;
  minPrices?: number;
  channels: { name: string; count: number }[];
  // without the priceDrop.channelId setting
  priceDrop?: { name: string; count: number };
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
  // ad_scraped events with prices from at least minPrices countries; without the countryOutlier.minPrices setting
  comparable?: { minPrices: number; total: number; previousTotal: number };
  // channels of the countryOutlier.ruleGroups setting; id matches the channel of a series
  countryOutlierChannels: { id: string; name: string }[];
}

export type LogLevelCounts = { error: number; warn: number };

export interface LogStatsDto {
  series: { level: "error" | "warn"; points: TimePoint[] }[];
  totals: LogLevelCounts;
  previousTotals: LogLevelCounts;
  topSources: ({ source: string } & LogLevelCounts)[];
}
