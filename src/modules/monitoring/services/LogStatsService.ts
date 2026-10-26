import _ from "lodash";
import { LogLevelCounts, LogStatsDto } from "@/modules/monitoring/dtos/StatsDtos";
import {
  previousRange,
  TimeRange,
  toHourIso,
} from "@/modules/monitoring/helpers/parseTimeRange";
import { SystemLogRepository } from "@/shared/logging/repositories/SystemLogRepository";

const LEVELS = ["error", "warn"] as const;
const TOP_SOURCES = 10;

type Count = { level: "error" | "warn"; value: number };

export class LogStatsService {
  private repository;

  constructor(repository = new SystemLogRepository()) {
    this.repository = repository;
  }

  async get(range: TimeRange): Promise<LogStatsDto> {
    const previous = previousRange(range);
    const [current, before, sources] = await Promise.all([
      this.repository.getCountByLevelAndHour(range.from, range.to),
      this.repository.getCountByLevelAndHour(previous.from, previous.to),
      this.repository.getCountBySourceAndLevel(range.from, range.to),
    ]);

    const series = LEVELS.map((level) => ({
      level,
      points: _.sortBy(
        current.filter((row) => row.level === level),
        "hour"
      ).map((row) => ({ t: toHourIso(row.hour), value: row.value })),
    }));
    const topSources = _.sortBy(
      Object.entries(_.groupBy(sources, "source")).map(([source, rows]) => ({
        source,
        ...this.totals(rows),
      })),
      [(row) => -(row.error + row.warn), "source"]
    ).slice(0, TOP_SOURCES);

    return { series, totals: this.totals(current), previousTotals: this.totals(before), topSources };
  }

  private totals(rows: Count[]): LogLevelCounts {
    const totals = { error: 0, warn: 0 };
    rows.forEach((row) => (totals[row.level] += row.value));
    return totals;
  }
}
