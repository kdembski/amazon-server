export interface ScraperMetricValue {
  metric: string;
  outcome: string | null;
  value: number;
}

export interface ScraperMetricSum extends ScraperMetricValue {
  scraper: string;
}

// group = scraper or country; hour = epoch seconds of the UTC hour start
export interface ScraperGroupHourSum extends ScraperMetricValue {
  group: string;
  hour: number;
}

export interface ScraperMetricGroupSum extends ScraperMetricSum {
  group: string | null;
}

export interface ScraperStatusSum extends ScraperMetricSum {
  reports: number;
}
