import _ from "lodash";
import { BusinessLogType } from "@prisma/client";
import { ActivityStatsDto } from "@/modules/monitoring/dtos/StatsDtos";
import { previousRange, toHourIso } from "@/modules/monitoring/helpers/hours";
import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";
import { BusinessLogRepository } from "@/modules/monitoring/repositories/BusinessLogRepository";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { SettingService } from "@/modules/settings/services/SettingService";

type Row = Awaited<ReturnType<BusinessLogRepository["getSumByTypeChannelAndHour"]>>[number];

export class ActivityStatsService {
  private repository;
  private activityCountService;
  private settingService;

  constructor(
    repository = new BusinessLogRepository(),
    activityCountService = new ActivityCountService(),
    settingService = new SettingService()
  ) {
    this.repository = repository;
    this.activityCountService = activityCountService;
    this.settingService = settingService;
  }

  async get(range: TimeRange): Promise<ActivityStatsDto> {
    const previous = previousRange(range);
    const [current, before, comparable, countryOutlierChannels] = await Promise.all([
      this.repository.getSumByTypeChannelAndHour(range.from, range.to),
      this.repository.getSumByTypeChannelAndHour(previous.from, previous.to),
      this.getComparable(range, previous),
      this.settingService.getCountryOutlierChannels(),
    ]);

    const groups = _.groupBy(current, (row) => `${row.type}\u0000${row.channel ?? ""}`);
    const series = _.sortBy(Object.values(groups), [
      (rows) => rows[0].type,
      (rows) => rows[0].channel ?? "",
    ]).map((rows) => ({
      type: rows[0].type,
      channel: rows[0].channel,
      points: _.sortBy(rows, "hour").map((row) => ({ t: toHourIso(row.hour), value: row.value })),
    }));

    return {
      series,
      totals: this.totals(current),
      previousTotals: this.totals(before),
      comparable,
      countryOutlierChannels: countryOutlierChannels.map(({ id, name }) => ({ id: String(id), name })),
    };
  }

  private async getComparable(range: TimeRange, previous: TimeRange) {
    const minPrices = await this.settingService.get("countryOutlier.minPrices");
    if (minPrices === undefined) return undefined;

    const [points, previousTotal] = await Promise.all([
      this.activityCountService.getHourlyCountWithMinPrices("ad_scraped", minPrices, range.from, range.to),
      this.activityCountService.getCountWithMinPrices("ad_scraped", minPrices, previous.from, previous.to),
    ]);
    return { minPrices, total: _.sumBy(points, "value"), previousTotal, points };
  }

  private totals(rows: Row[]) {
    const totals = Object.fromEntries(
      Object.values(BusinessLogType).map((type) => [type, 0])
    ) as Record<BusinessLogType, number>;
    rows.forEach((row) => (totals[row.type] += row.value));
    return totals;
  }
}
