import _ from "lodash";
import {
  ScraperBreakdown,
  ScraperBreakdownKey,
  ScraperMetrics,
  ScraperMetricSum,
  ScraperMetricSummary,
  ScraperMetricsDto,
  ScraperSeries,
  ScraperStatus,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { TimeRange, toHourIso } from "@/modules/monitoring/helpers/parseTimeRange";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";

// Scrapers without a report in this window drop out of the statuses
const STATUS_WINDOW_MS = 7 * 86_400_000;

export class ScraperMetricService {
  private repository;
  private mapper;
  private idempotencyCache;

  constructor(
    repository = new ScraperMetricRepository(),
    mapper = new ScraperMetricCreateMapper(),
    idempotencyCache = IdempotencyCache.getInstance()
  ) {
    this.repository = repository;
    this.mapper = mapper;
    this.idempotencyCache = idempotencyCache;
  }

  async add(scraper: string, dto: ScraperMetricsDto, key?: string) {
    const rows = this.mapper.toCreateInputs(scraper, dto);
    if (rows.length === 0) {
      return 0;
    }
    const store = () => this.repository.createMany(rows);
    return key ? this.idempotencyCache.run(key, store) : store();
  }

  async getSummaries(from: Date, to: Date): Promise<ScraperMetricSummary[]> {
    const previousFrom = new Date(
      from.getTime() - (to.getTime() - from.getTime())
    );
    const [current, previous] = await Promise.all([
      this.repository.sumByScraper(from, to),
      this.repository.sumByScraper(previousFrom, from),
    ]);

    const currentByScraper = _.groupBy(current, "scraper");
    const previousByScraper = _.groupBy(previous, "scraper");

    return Object.keys(currentByScraper)
      .sort()
      .map((scraper) => {
        const summary = this.summarize(currentByScraper[scraper], from, to);
        const previousItemsPerSecond = this.itemsPerSecond(
          previousByScraper[scraper] ?? [],
          previousFrom,
          from
        );

        return {
          scraper,
          ...summary,
          itemsPerSecondDiff: summary.itemsPerSecond - previousItemsPerSecond,
          previousRequests: this.total(previousByScraper[scraper] ?? [], "requests"),
        };
      });
  }

  async getBreakdown(
    from: Date,
    to: Date,
    by: ScraperBreakdownKey
  ): Promise<ScraperBreakdown[]> {
    const sums = await this.repository.sumByScraperAnd(by, from, to);
    // Metrics without a country (connections, bytes) would form a group of their own
    const groups = _.groupBy(
      sums.filter((sum) => sum.group !== null),
      (sum) => JSON.stringify([sum.scraper, sum.group])
    );

    return _.sortBy(
      Object.values(groups).map((groupSums) => ({
        scraper: groupSums[0].scraper,
        group: groupSums[0].group as string,
        ...this.summarize(groupSums, from, to),
      })),
      ["scraper", "group"]
    );
  }

  async getStatuses(): Promise<ScraperStatus[]> {
    const since = new Date(Date.now() - STATUS_WINDOW_MS);
    const reports = await this.repository.getLastReports(since);

    return reports.flatMap(({ scraper, createdAt }) =>
      createdAt ? [{ scraper, lastReportAt: createdAt.toISOString() }] : []
    );
  }

  async getSeries(range: TimeRange): Promise<ScraperSeries[]> {
    const rows = await this.repository.getSumByScraperAndHour(range.from, range.to);

    return Object.entries(_.groupBy(rows, "scraper"))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([scraper, scraperRows]) => ({
        scraper,
        points: _.sortBy(Object.entries(_.groupBy(scraperRows, "hour")), ([hour]) => Number(hour))
          .map(([hour, sums]) => {
            const hourStart = Number(hour) * 1000;
            const from = new Date(Math.max(hourStart, range.from.getTime()));
            const to = new Date(Math.min(hourStart + 3_600_000, range.to.getTime()));
            const { itemsPerSecond, wastedPercent, captchaPercent, requests } =
              this.summarize(sums, from, to);
            return {
              t: toHourIso(Number(hour)),
              itemsPerSecond,
              wastedPercent,
              captchaPercent,
              requests,
            };
          }),
      }));
  }

  private summarize(sums: ScraperMetricSum[], from: Date, to: Date): ScraperMetrics {
    const requests = this.total(sums, "requests");
    const items = this.total(sums, "items");
    const dataItems = this.total(sums, "items", ["data"]);
    const bytesIn = this.total(sums, "bytes_in");
    const bytesOut = this.total(sums, "bytes_out");
    const bytes = bytesIn + bytesOut;
    const connections = this.total(sums, "connections");
    const wasted =
      requests -
      this.total(sums, "requests", ["ok", "http_404"]) +
      this.total(sums, "responses", ["captcha", "invalid", "empty", "parse_error"]);

    return {
      itemsPerSecond: this.itemsPerSecond(sums, from, to),
      requests,
      wastedPercent: requests > 0 ? (wasted / requests) * 100 : 0,
      captchaPercent:
        requests > 0 ? (this.total(sums, "responses", ["captcha"]) / requests) * 100 : 0,
      kbPerItem: dataItems > 0 ? bytes / 1024 / dataItems : null,
      reusePercent: requests > 0 ? Math.max(0, 1 - connections / requests) * 100 : 0,
      attemptsPerItem: items > 0 ? this.total(sums, "item_attempts") / items : null,
      bytesIn,
      bytesOut,
      connections,
    };
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }

  private total(sums: ScraperMetricSum[], metric: string, outcomes?: string[]) {
    return _.sumBy(sums, (sum) =>
      sum.metric === metric &&
      (!outcomes || (sum.outcome !== null && outcomes.includes(sum.outcome)))
        ? sum.value
        : 0
    );
  }

  private itemsPerSecond(sums: ScraperMetricSum[], from: Date, to: Date) {
    const given = this.total(sums, "items", ["given_up"]);
    const seconds = (to.getTime() - from.getTime()) / 1000;
    return (this.total(sums, "items") - given) / seconds;
  }
}
