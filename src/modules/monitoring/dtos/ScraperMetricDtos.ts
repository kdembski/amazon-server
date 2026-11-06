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

export interface ScraperMetricValue {
  metric: string;
  outcome: string | null;
  value: number;
}

export interface ScraperMetricSum extends ScraperMetricValue {
  scraper: string;
}

export type ScraperCountKey = "scraper" | "country";

// group = scraper or country; hour = epoch seconds of the UTC hour start
export interface ScraperGroupHourSum extends ScraperMetricValue {
  group: string;
  hour: number;
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
  // bytes_in + bytes_out through proxies and over direct connections
  proxyBytes: number;
  previousProxyBytes: number;
  directBytes: number;
  previousDirectBytes: number;
}

// connections and bytes carry no country: per country they are 0 and kbPerItem and reusePercent mean nothing
export interface ScraperBreakdown extends ScraperMetrics {
  scraper: string;
  group: string;
}

// Averages of the last hour: rates over the whole hour, gauges over its reports; rps and concurrency from ScraperConfig, scrapers without a row are left out
export interface ScraperStatus {
  scraper: string;
  lastReportAt: string;
  itemsPerSecond: number;
  requestsPerSecond: number;
  // 0 = no limit
  rps: number;
  pending: number;
  concurrency: number;
  openConnections: number;
}

export interface ScraperLastReport {
  scraper: string;
  reportedAt: Date;
}

export interface ScraperStatusSum extends ScraperMetricSum {
  reports: number;
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
export type ScraperCountSeriesByKey = Record<ScraperCountKey, ScraperCountSeries[]>;
