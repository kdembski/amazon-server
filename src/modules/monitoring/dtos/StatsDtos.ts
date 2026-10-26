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
