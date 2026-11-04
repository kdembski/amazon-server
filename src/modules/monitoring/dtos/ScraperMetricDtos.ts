import { Marketplace } from "@prisma/client";

export interface ScraperMetricDto {
  metric: string;
  country?: string;
  outcome?: string;
  value: number;
}

export interface ScraperMetricsDto {
  marketplace: Marketplace;
  flow: string;
  periodStart: string;
  metrics: ScraperMetricDto[];
}

export interface ScraperMetricSum {
  scraper: string;
  metric: string;
  outcome: string | null;
  value: number;
}

export type ScraperBreakdownKey = "country" | "flow";

export interface ScraperMetricGroupSum extends ScraperMetricSum {
  group: string | null;
}

export interface ScraperMetrics {
  itemsPerSecond: number;
  requests: number;
  wastedPercent: number;
  captchaPercent: number;
  kbPerItem: number | null;
  reusePercent: number;
  attemptsPerItem: number | null;
  bytesIn: number;
  bytesOut: number;
  connections: number;
}

export interface ScraperMetricSummary extends ScraperMetrics {
  scraper: string;
  itemsPerSecondDiff: number;
  previousRequests: number;
}

// connections and bytes carry no country: per country they are 0 and kbPerItem and reusePercent mean nothing
export interface ScraperBreakdown extends ScraperMetrics {
  scraper: string;
  group: string;
}

export interface ScraperStatus {
  scraper: string;
  lastReportAt: string;
}

export interface ScraperSeriesPoint {
  t: string;
  itemsPerSecond: number;
  wastedPercent: number;
  captchaPercent: number;
  requests: number;
}

export interface ScraperSeries {
  scraper: string;
  points: ScraperSeriesPoint[];
}
