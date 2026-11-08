import _ from "lodash";
import { ScraperStatus } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { compareScrapers } from "@/modules/monitoring/helpers/compareScrapers";
import { HOUR_MS } from "@/modules/monitoring/helpers/hours";
import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { ScraperMetricSums } from "@/modules/monitoring/services/ScraperMetricSums";

// Scrapers without a report in this window drop out of the statuses
const STATUS_WINDOW_MS = 7 * 86_400_000;

export class ScraperStatusService {
  private repository;
  private configRepository;

  constructor(repository = new ScraperMetricRepository(), configRepository = new ScraperConfigRepository()) {
    this.repository = repository;
    this.configRepository = configRepository;
  }

  async getStatuses(): Promise<ScraperStatus[]> {
    const to = new Date();
    const from = new Date(to.getTime() - HOUR_MS);
    const since = new Date(to.getTime() - STATUS_WINDOW_MS);
    const [lastReports, rows, configs] = await Promise.all([
      this.repository.getLastReports(since),
      this.repository.sumStatusMetrics(from),
      this.configRepository.findAll(),
    ]);
    const configByScraper = _.keyBy(configs, "scraper");
    const rowsByScraper = _.groupBy(rows, "scraper");

    return lastReports
      .sort((a, b) => compareScrapers(a.scraper, b.scraper))
      .flatMap(({ scraper, reportedAt }) => {
        const config = configByScraper[scraper];
        if (!config) {
          return [];
        }

        // Stopped for over an hour: no sums, so every average is 0
        const scraperRows = rowsByScraper[scraper] ?? [];
        const sums = new ScraperMetricSums(scraperRows);
        const reports = scraperRows.find((row) => row.metric === "cpu_percent")?.reports ?? 0;
        const average = (metric: string) => (reports > 0 ? sums.total(metric) / reports : 0);

        return [
          {
            scraper,
            lastReportAt: reportedAt.toISOString(),
            itemsPerSecond: sums.itemsPerSecond({ from, to }),
            requestsPerSecond: sums.total("requests") / (HOUR_MS / 1000),
            rps: config.rps,
            pending: average("pending"),
            concurrency: config.concurrency,
            openConnections: average("open_connections"),
          },
        ];
      });
  }
}
