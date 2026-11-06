import _ from "lodash";
import {
  ScraperBreakdown,
  ScraperBreakdownKey,
  ScraperCountSeries,
  ScraperCountSeriesByKey,
  ScraperGroupHourSum,
  ScraperMetrics,
  ScraperMetricSummary,
  ScraperMetricsDto,
  ScraperMetricValue,
  ScraperSeries,
  ScraperStatus,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { compareScrapers } from "@/modules/monitoring/helpers/compareScrapers";
import { TimeRange, toHourIso } from "@/modules/monitoring/helpers/parseTimeRange";
import {
  floorHour,
  HOUR_MS,
  RangePart,
  splitByRollup,
} from "@/modules/monitoring/helpers/splitByRollup";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ScraperConfigRepository } from "@/modules/monitoring/repositories/ScraperConfigRepository";
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
  private configRepository;

  constructor(
    repository = new ScraperMetricRepository(),
    mapper = new ScraperMetricCreateMapper(),
    idempotencyCache = IdempotencyCache.getInstance(),
    configRepository = new ScraperConfigRepository()
  ) {
    this.repository = repository;
    this.mapper = mapper;
    this.idempotencyCache = idempotencyCache;
    this.configRepository = configRepository;
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
      .sort(compareScrapers)
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

    return Object.values(groups)
      .map((groupSums) => ({
        scraper: groupSums[0].scraper,
        group: groupSums[0].group as string,
        ...this.summarize(groupSums, from, to),
      }))
      .sort((a, b) => compareScrapers(a.scraper, b.scraper) || a.group.localeCompare(b.group));
  }

  async getStatuses(): Promise<ScraperStatus[]> {
    const since = new Date(Date.now() - STATUS_WINDOW_MS);
    const [rows, configs] = await Promise.all([
      this.repository.getLatestReports(since),
      this.configRepository.findAll(),
    ]);
    const configByScraper = _.keyBy(configs, "scraper");

    return Object.entries(_.groupBy(rows, "scraper"))
      .sort(([a], [b]) => compareScrapers(a, b))
      .map(([scraper, sums]) => {
        const config = configByScraper[scraper];
        // The report covers periodStart until it was sent, which is about when it arrived
        const { periodStart } = sums[0];
        const reportedAt = _.maxBy(sums, (sum) => sum.createdAt.getTime())!.createdAt;
        const seconds = Math.max(1, (reportedAt.getTime() - periodStart.getTime()) / 1000);

        return {
          scraper,
          lastReportAt: reportedAt.toISOString(),
          itemsPerSecond: this.itemsPerSecond(sums, periodStart, reportedAt),
          requestsPerSecond: this.total(sums, "requests") / seconds,
          rps: config?.rps ?? null,
          pending: this.total(sums, "pending"),
          concurrency: config?.concurrency ?? null,
          openConnections: this.total(sums, "open_connections"),
        };
      });
  }

  async getSeries(range: TimeRange): Promise<ScraperSeries[]> {
    const rows = await this.sumParts(
      range,
      await this.repository.getRolledUpUntil(),
      (part) => this.repository.getSumByScraperAndHour(part.from, part.to, part.hourly)
    );

    return this.groupByKeyAndHour(rows, "scraper").map(([scraper, hours]) => ({
      scraper,
      points: hours.map(([hour, sums]) => {
        const hourStart = hour * 1000;
        const from = new Date(Math.max(hourStart, range.from.getTime()));
        const to = new Date(Math.min(hourStart + 3_600_000, range.to.getTime()));
        const { itemsPerSecond, wastedPercent, captchaPercent, requests } = this.summarize(
          sums,
          from,
          to
        );
        return {
          t: toHourIso(hour),
          itemsPerSecond,
          wastedPercent,
          captchaPercent,
          requests,
        };
      }),
    }));
  }

  async getCountSeries(range: TimeRange): Promise<ScraperCountSeriesByKey> {
    const rolledUpUntil = await this.repository.getRolledUpUntil();
    const [scraper, country] = await Promise.all(
      (["scraper", "country"] as const).map((by) =>
        this.sumParts(range, rolledUpUntil, (part) =>
          this.repository.getSumByHourAnd(by, part.from, part.to, part.hourly)
        )
      )
    );

    return { scraper: this.toCountSeries(scraper), country: this.toCountSeries(country) };
  }

  private toCountSeries(rows: ScraperGroupHourSum[]): ScraperCountSeries[] {
    return this.groupByKeyAndHour(rows, "group").map(([group, hours]) => ({
      group,
      points: hours.map(([hour, sums]) => ({
        t: toHourIso(hour),
        requests: this.total(sums, "requests"),
        wasted: this.wasted(sums),
        captcha: this.total(sums, "responses", ["captcha"]),
        http503: this.total(sums, "requests", ["http_503"]),
        items: this.total(sums, "items"),
        itemAttempts: this.total(sums, "item_attempts"),
        proxyBytes: this.bytes(sums, ["proxy"]),
        directBytes: this.bytes(sums, DIRECT_ROUTES),
      })),
    }));
  }

  private summarize(sums: ScraperMetricValue[], from: Date, to: Date): ScraperMetrics {
    const requests = this.total(sums, "requests");
    const items = this.total(sums, "items");
    const dataItems = this.total(sums, "items", ["data"]);
    const bytesIn = this.total(sums, "bytes_in");
    const bytesOut = this.total(sums, "bytes_out");
    const bytes = bytesIn + bytesOut;
    const connections = this.total(sums, "connections");
    const wasted = this.wasted(sums);

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

  // Rows per key and hour, both sorted ascending
  private groupByKeyAndHour<T extends ScraperMetricValue & { hour: number }>(
    rows: T[],
    key: keyof T & string
  ) {
    return Object.entries(_.groupBy(rows, key))
      .sort(([a], [b]) => compareScrapers(a, b))
      .map(([value, keyRows]) => {
        const hours = Object.entries(_.groupBy(keyRows, "hour"))
          .map(([hour, sums]): [number, T[]] => [Number(hour), sums])
          .sort(([a], [b]) => a - b);
        return [value, hours] as const;
      });
  }

  private wasted(sums: ScraperMetricValue[]) {
    return (
      this.total(sums, "requests") -
      this.total(sums, "requests", ["ok", "http_404"]) +
      this.total(sums, "responses", ["captcha", "invalid", "empty", "parse_error"])
    );
  }

  private total(sums: ScraperMetricValue[], metric: string, outcomes?: string[]) {
    return _.sumBy(sums, (sum) =>
      sum.metric === metric &&
      (!outcomes || (sum.outcome !== null && outcomes.includes(sum.outcome)))
        ? sum.value
        : 0
    );
  }

  private bytes(sums: ScraperMetricValue[], routes: string[]) {
    return this.total(sums, "bytes_in", routes) + this.total(sums, "bytes_out", routes);
  }

  private itemsPerSecond(sums: ScraperMetricValue[], from: Date, to: Date) {
    const given = this.total(sums, "items", ["given_up"]);
    const seconds = (to.getTime() - from.getTime()) / 1000;
    return (this.total(sums, "items") - given) / seconds;
  }
}
