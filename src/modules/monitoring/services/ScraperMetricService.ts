import _ from "lodash";
import {
  ScraperBreakdown,
  ScraperBreakdownKey,
  ScraperCountSeries,
  ScraperCountSeriesByKey,
  ScraperGroupHourSum,
  ScraperMetricSummary,
  ScraperMetricsDto,
  ScraperMetricValue,
  ScraperSeries,
} from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { compareScrapers } from "@/modules/monitoring/helpers/compareScrapers";
import { HOUR_MS, previousRange, toHourIso } from "@/modules/monitoring/helpers/hours";
import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";
import { ScraperMetricCreateMapper } from "@/modules/monitoring/mappers/ScraperMetricCreateMapper";
import { ScraperMetricRepository } from "@/modules/monitoring/repositories/ScraperMetricRepository";
import { ScraperMetricRollupService } from "@/modules/monitoring/services/ScraperMetricRollupService";
import { ScraperMetricSums } from "@/modules/monitoring/services/ScraperMetricSums";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";

export class ScraperMetricService {
  private repository;
  private mapper;
  private idempotencyCache;
  private rollupService;

  constructor(
    repository = new ScraperMetricRepository(),
    mapper = new ScraperMetricCreateMapper(),
    idempotencyCache = IdempotencyCache.getInstance(),
    rollupService = new ScraperMetricRollupService(repository)
  ) {
    this.repository = repository;
    this.mapper = mapper;
    this.idempotencyCache = idempotencyCache;
    this.rollupService = rollupService;
  }

  async add(scraper: string, dto: ScraperMetricsDto, key?: string) {
    const rows = this.mapper.toCreateInputs(scraper, dto);
    if (rows.length === 0) {
      return 0;
    }
    return this.idempotencyCache.run(key, () => this.repository.createMany(rows));
  }

  deleteOlderThan(date: Date) {
    return this.repository.deleteOlderThan(date);
  }

  async getSummaries(from: Date, to: Date): Promise<ScraperMetricSummary[]> {
    const range = { from, to };
    const previous = previousRange(range);
    const rolledUpUntil = await this.rollupService.getRolledUpUntil();
    const sum = (part: TimeRange) => {
      return this.rollupService.sumParts(part, rolledUpUntil, (p) => {
        return this.repository.sumByScraper(p.from, p.to, p.hourly);
      });
    };
    const [current, before] = await Promise.all([sum(range), sum(previous)]);

    const currentByScraper = _.groupBy(current, "scraper");
    const previousByScraper = _.groupBy(before, "scraper");

    return Object.keys(currentByScraper)
      .sort(compareScrapers)
      .map((scraper) => {
        const sums = new ScraperMetricSums(currentByScraper[scraper]);
        const previousSums = new ScraperMetricSums(previousByScraper[scraper] ?? []);
        const summary = sums.summarize(range);

        return {
          scraper,
          ...summary,
          itemsPerSecondDiff: summary.itemsPerSecond - previousSums.itemsPerSecond(previous),
          previousRequests: previousSums.total("requests"),
          proxyBytes: sums.proxyBytes(),
          previousProxyBytes: previousSums.proxyBytes(),
          directBytes: sums.directBytes(),
          previousDirectBytes: previousSums.directBytes(),
        };
      });
  }

  async getBreakdown(from: Date, to: Date, by: ScraperBreakdownKey): Promise<ScraperBreakdown[]> {
    const rows = await this.rollupService.sumParts(
      { from, to },
      await this.rollupService.getRolledUpUntil(),
      (part) => this.repository.sumByScraperAnd(by, part.from, part.to, part.hourly)
    );
    // Metrics without a country (connections, bytes) would form a group of their own
    const groups = _.groupBy(
      rows.filter((row) => row.group !== null),
      (row) => JSON.stringify([row.scraper, row.group])
    );

    return Object.values(groups)
      .map((groupRows) => ({
        scraper: groupRows[0].scraper,
        group: groupRows[0].group as string,
        ...new ScraperMetricSums(groupRows).summarize({ from, to }),
      }))
      .sort((a, b) => compareScrapers(a.scraper, b.scraper) || a.group.localeCompare(b.group));
  }

  async getSeries(range: TimeRange): Promise<ScraperSeries[]> {
    const rows = await this.rollupService.sumParts(
      range,
      await this.rollupService.getRolledUpUntil(),
      (part) => this.repository.getSumByScraperAndHour(part.from, part.to, part.hourly)
    );

    return this.groupByKeyAndHour(rows, "scraper").map(([scraper, hours]) => ({
      scraper,
      points: hours.map(([hour, sums]) => {
        const hourStart = hour * 1000;
        const from = new Date(Math.max(hourStart, range.from.getTime()));
        const to = new Date(Math.min(hourStart + HOUR_MS, range.to.getTime()));
        const { itemsPerSecond, wastedPercent, captchaPercent, requests } = sums.summarize({ from, to });
        return { t: toHourIso(hour), itemsPerSecond, wastedPercent, captchaPercent, requests };
      }),
    }));
  }

  async getCountSeries(range: TimeRange): Promise<ScraperCountSeriesByKey> {
    const rolledUpUntil = await this.rollupService.getRolledUpUntil();
    const [scraper, country] = await Promise.all(
      (["scraper", "country"] as const).map((by) => {
        return this.rollupService.sumParts(range, rolledUpUntil, (part) => {
          return this.repository.getSumByHourAnd(by, part.from, part.to, part.hourly);
        });
      })
    );

    return { scraper: this.toCountSeries(scraper), country: this.toCountSeries(country) };
  }

  private toCountSeries(rows: ScraperGroupHourSum[]): ScraperCountSeries[] {
    return this.groupByKeyAndHour(rows, "group").map(([group, hours]) => ({
      group,
      points: hours.map(([hour, sums]) => ({
        t: toHourIso(hour),
        requests: sums.total("requests"),
        wasted: sums.wasted(),
        captcha: sums.total("responses", ["captcha"]),
        http503: sums.total("requests", ["http_503"]),
        items: sums.total("items"),
        itemAttempts: sums.total("item_attempts"),
        proxyBytes: sums.proxyBytes(),
        directBytes: sums.directBytes(),
      })),
    }));
  }

  // Sums per key and hour, both sorted ascending
  private groupByKeyAndHour<T extends ScraperMetricValue & { hour: number }>(rows: T[], key: keyof T & string) {
    return Object.entries(_.groupBy(rows, key))
      .sort(([a], [b]) => compareScrapers(a, b))
      .map(([value, keyRows]) => {
        const hours = Object.entries(_.groupBy(keyRows, "hour"))
          .map(([hour, hourRows]): [number, ScraperMetricSums] => [Number(hour), new ScraperMetricSums(hourRows)])
          .sort(([a], [b]) => a - b);
        return [value, hours] as const;
      });
  }
}
