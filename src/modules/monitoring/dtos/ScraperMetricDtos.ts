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

export interface ScraperMetricSummary {
  scraper: string;
  itemsPerSecond: number;
  itemsPerSecondDiff: number;
  requests: number;
  wastedPercent: number;
  captchaPercent: number;
  kbPerItem: number | null;
  reusePercent: number;
  attemptsPerItem: number | null;
}
