export interface ScraperMetricDto {
  metric: string;
  country?: string;
  outcome?: string;
  value: number;
}

export interface ScraperMetricsDto {
  marketplace: string;
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
  pending: number | null;
  requests: number;
  wastedPercent: number;
  captchaPercent: number;
  kbPerItem: number | null;
  reusePercent: number;
  attemptsPerItem: number | null;
}
