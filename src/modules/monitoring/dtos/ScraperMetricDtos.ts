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

export type ScraperCountKey = "scraper" | "country";

export type ScraperBreakdownKey = "country" | "flow";

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

export interface ScraperMetricSummaryDto extends ScraperMetrics {
  scraper: string;
  itemsPerSecondDiff: number;
  previousRequests: number;
  // bytes_in + bytes_out through proxies and over direct connections
  proxyBytes: number;
  previousProxyBytes: number;
  directBytes: number;
  previousDirectBytes: number;
}

// connections and bytes carry no country: per country they are 0 and kbPerItem and reusePercent mean nothing
export interface ScraperBreakdownDto extends ScraperMetrics {
  scraper: string;
  group: string;
}

// One per ScraperConfig row; averages of the last hour: rates over the whole hour, gauges over its reports
export interface ScraperStatusDto {
  scraper: string;
  // No report in the last 5 minutes
  stopped: boolean;
  itemsPerSecond: number;
  requestsPerSecond: number;
  // 0 = no limit
  rps: number;
  pending: number;
  concurrency: number;
  openConnections: number;
}

export interface ScraperSeriesPoint {
  t: string;
  itemsPerSecond: number;
  wastedPercent: number;
  captchaPercent: number;
  requests: number;
}

export interface ScraperSeriesDto {
  scraper: string;
  points: ScraperSeriesPoint[];
}

// Counts of one UTC hour; the admin sums hours into days before dividing them
export interface ScraperCountPoint {
  t: string;
  requests: number;
  wasted: number;
  captcha: number;
  http503: number;
  items: number;
  itemAttempts: number;
  proxyBytes: number;
  directBytes: number;
}

export interface ScraperCountSeries {
  group: string;
  points: ScraperCountPoint[];
}

// The same counts per scraper (every country) and per country (every scraper)
export type ScraperCountSeriesDto = Record<ScraperCountKey, ScraperCountSeries[]>;
