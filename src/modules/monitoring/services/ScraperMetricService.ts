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
import {
  floorHour,
  HOUR_MS,
  RangePart,
  splitByRollup,
} from "@/modules/monitoring/helpers/splitByRollup";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";

// Scrapers without a report in this window drop out of the statuses
const STATUS_WINDOW_MS = 7 * 86_400_000;
// shortcut: metrics of an hour that arrive later than this are missing from its hourly sums; re-roll the hour if scrapers start sending late
const ROLLUP_DELAY_MS = 5 * 60_000;
// The scraper labels traffic with its route: proxy, direct4 or direct6
const DIRECT_ROUTES = ["direct4", "direct6"];

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
    const rolledUpUntil = await this.repository.getRolledUpUntil();
    const sum = (range: TimeRange) => {
      return this.sumParts(range, rolledUpUntil, (part) =>
        this.repository.sumByScraper(part.from, part.to, part.hourly)
      );
    };
    const [current, previous] = await Promise.all([
      sum({ from, to }),
      sum({ from: previousFrom, to: from }),
    ]);

    const currentByScraper = _.groupBy(current, "scraper");
    const previousByScraper = _.groupBy(previous, "scraper");

    return Object.keys(currentByScraper)
      .sort()
      .map((scraper) => {
        const previousSums = previousByScraper[scraper] ?? [];
        const summary = this.summarize(currentByScraper[scraper], from, to);
        const previousItemsPerSecond = this.itemsPerSecond(previousSums, previousFrom, from);

        return {
          scraper,
          ...summary,
          itemsPerSecondDiff: summary.itemsPerSecond - previousItemsPerSecond,
          previousRequests: this.total(previousSums, "requests"),
          proxyBytes: this.bytes(currentByScraper[scraper], ["proxy"]),
          previousProxyBytes: this.bytes(previousSums, ["proxy"]),
          directBytes: this.bytes(currentByScraper[scraper], DIRECT_ROUTES),
          previousDirectBytes: this.bytes(previousSums, DIRECT_ROUTES),
        };
      });
  }

  async getBreakdown(
    from: Date,
    to: Date,
    by: ScraperBreakdownKey
  ): Promise<ScraperBreakdown[]> {
    const sums = await this.sumParts(
      { from, to },
      await this.repository.getRolledUpUntil(),
      (part) => this.repository.sumByScraperAnd(by, part.from, part.to, part.hourly)
    );
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
    const rows = await this.sumParts(
      range,
      await this.repository.getRolledUpUntil(),
      (part) => this.repository.getSumByScraperAndHour(part.from, part.to, part.hourly)
    );

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

  // Rolls up every finished hour after the newest rolled-up one; returns the number of hours
  async rollUp(now: Date) {
    const end = floorHour(new Date(now.getTime() - ROLLUP_DELAY_MS));
    const oldest = await this.repository.getOldestPeriodStart();
    const start = (await this.repository.getRolledUpUntil()) ?? (oldest && floorHour(oldest));
    if (!start) {
      return 0;
    }

    let hours = 0;
    for (let hour = start; hour < end; hour = new Date(hour.getTime() + HOUR_MS)) {
      await this.repository.rollUpHour(hour);
      hours++;
    }
    return hours;
  }

  // The parts do not overlap, so concatenated sums add up like one query over the range
  private async sumParts<T>(
    range: TimeRange,
    rolledUpUntil: Date | null,
    read: (part: RangePart) => Promise<T[]>
  ) {
    const parts = await Promise.all(splitByRollup(range, rolledUpUntil).map(read));
    return parts.flat();
  }

  private total(sums: ScraperMetricSum[], metric: string, outcomes?: string[]) {
    return _.sumBy(sums, (sum) =>
      sum.metric === metric &&
      (!outcomes || (sum.outcome !== null && outcomes.includes(sum.outcome)))
        ? sum.value
        : 0
    );
  }

  private bytes(sums: ScraperMetricSum[], routes: string[]) {
    return this.total(sums, "bytes_in", routes) + this.total(sums, "bytes_out", routes);
  }

  private itemsPerSecond(sums: ScraperMetricSum[], from: Date, to: Date) {
    const given = this.total(sums, "items", ["given_up"]);
    const seconds = (to.getTime() - from.getTime()) / 1000;
    return (this.total(sums, "items") - given) / seconds;
  }
}
