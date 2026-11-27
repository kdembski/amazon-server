export interface HourlyReportCounts {
  scraped: number;
  // without the countryOutlier.minPrices setting
  comparable?: number;
  minPrices?: number;
  channels: { name: string; count: number }[];
  priceDropChannels: { name: string; count: number }[];
}
