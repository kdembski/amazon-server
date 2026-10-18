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
