import _ from "lodash";
import { ActivityEventType } from "@prisma/client";
import { ActivityStatsDto } from "@/modules/monitoring/dtos/StatsDtos";
import {
  previousRange,
  TimeRange,
  toHourIso,
} from "@/modules/monitoring/helpers/parseTimeRange";
import { ActivityEventRepository } from "@/modules/monitoring/repositories/ActivityEventRepository";

type Row = Awaited<ReturnType<ActivityEventRepository["getSumByTypeChannelAndHour"]>>[number];

export class ActivityStatsService {
  private repository;

  constructor(repository = new ActivityEventRepository()) {
    this.repository = repository;
  }

  async get(range: TimeRange): Promise<ActivityStatsDto> {
    const previous = previousRange(range);
    const current = await this.repository.getSumByTypeChannelAndHour(range.from, range.to);
    const before = await this.repository.getSumByTypeChannelAndHour(previous.from, previous.to);

    const groups = _.groupBy(current, (row) => `${row.type}\u0000${row.channel ?? ""}`);
    const series = _.sortBy(Object.values(groups), [
      (rows) => rows[0].type,
      (rows) => rows[0].channel ?? "",
    ]).map((rows) => ({
      type: rows[0].type,
      channel: rows[0].channel,
      points: _.sortBy(rows, "hour").map((row) => ({ t: toHourIso(row.hour), value: row.value })),
    }));

    return { series, totals: this.totals(current), previousTotals: this.totals(before) };
  }

  private totals(rows: Row[]) {
    const totals = Object.fromEntries(
      Object.values(ActivityEventType).map((type) => [type, 0])
    ) as Record<ActivityEventType, number>;
    rows.forEach((row) => (totals[row.type] += row.value));
    return totals;
  }
}
