import _ from "lodash";
import { BusinessLogType } from "@prisma/client";
import { ActivityStatsDto } from "@/modules/monitoring/dtos/StatsDtos";
import {
  previousRange,
  TimeRange,
  toHourIso,
} from "@/modules/monitoring/helpers/parseTimeRange";
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
    const current = await this.repository.getSumByTypeChannelAndHour(range.from, range.to);
    const before = await this.repository.getSumByTypeChannelAndHour(previous.from, previous.to);
    const comparable = await this.getComparable(range, previous);

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
      countryOutlierChannels: await this.getCountryOutlierChannels(),
    };
  }

  private async getCountryOutlierChannels() {
    const channels = await this.settingService.getChannels();
    const ruleGroups = await this.settingService.get("countryOutlier.ruleGroups");
    const ids = _.uniq((ruleGroups ?? []).flat().map((rule) => rule.channelId));

    return ids.map((id) => {
      const name = channels.find((channel) => channel.id === id)?.name ?? `#${id}`;
      return { id: String(id), name };
    });
  }

  private async getComparable(range: TimeRange, previous: TimeRange) {
    const minPrices = await this.settingService.get("countryOutlier.minPrices");
    if (minPrices === undefined) return undefined;

    const count = (period: TimeRange) => {
      return this.activityCountService.getCountWithMinPrices("ad_scraped", minPrices, period.from, period.to);
    };
    return { minPrices, total: await count(range), previousTotal: await count(previous) };
  }

  private totals(rows: Row[]) {
    const totals = Object.fromEntries(
      Object.values(BusinessLogType).map((type) => [type, 0])
    ) as Record<BusinessLogType, number>;
    rows.forEach((row) => (totals[row.type] += row.value));
    return totals;
  }
}
