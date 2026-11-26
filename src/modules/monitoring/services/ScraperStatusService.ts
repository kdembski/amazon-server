import _ from "lodash";
import { ScraperStatus } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { compareScrapers } from "@/modules/monitoring/helpers/compare-scrapers";
import { HOUR_MS } from "@/modules/monitoring/helpers/hours";
import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { ScraperMetricSums } from "@/modules/monitoring/services/ScraperMetricSums";

const STOPPED_AFTER_MS = 5 * 60_000;

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
    const [reporting, rows, configs] = await Promise.all([
      this.repository.getReportingScrapers(new Date(to.getTime() - STOPPED_AFTER_MS)),
      this.repository.sumStatusMetrics(from),
      this.configRepository.findAll(),
    ]);
    const rowsByScraper = _.groupBy(rows, "scraper");

    return configs
      .sort((a, b) => compareScrapers(a.scraper, b.scraper))
      .map(({ scraper, rps, concurrency }) => {
        // Stopped for over an hour: no sums, so every average is 0
        const scraperRows = rowsByScraper[scraper] ?? [];
        const sums = new ScraperMetricSums(scraperRows);
        const reports = scraperRows.find((row) => row.metric === "cpu_percent")?.reports ?? 0;
        const average = (metric: string) => (reports > 0 ? sums.total(metric) / reports : 0);

        return {
          scraper,
          stopped: !reporting.includes(scraper),
          itemsPerSecond: sums.itemsPerSecond({ from, to }),
          requestsPerSecond: sums.total("requests") / (HOUR_MS / 1000),
          rps,
          pending: average("pending"),
          concurrency,
          openConnections: average("open_connections"),
        };
      });
  }
}
