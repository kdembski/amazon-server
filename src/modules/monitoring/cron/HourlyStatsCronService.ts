import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { HourlyReportCounts } from "@/modules/monitoring/dtos/StatsDtos";
import { BusinessLogType } from "@prisma/client";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { SettingService } from "@/modules/settings/services/SettingService";
import _ from "lodash";
import { CronJob } from "cron";

export class HourlyStatsCronService {
  private discordService;
  private businessLogService;
  private metricService;
  private logger;
  private activityCountService;
  private settingService;

  constructor(
    discordService = new DiscordLogService(),
    businessLogService = new BusinessLogService(),
    metricService = new ScraperMetricService(),
    logger = SystemLogService.getInstance(),
    activityCountService = new ActivityCountService(),
    settingService = new SettingService()
  ) {
    this.discordService = discordService;
    this.businessLogService = businessLogService;
    this.metricService = metricService;
    this.logger = logger;
    this.activityCountService = activityCountService;
    this.settingService = settingService;
  }

  schedule() {
    new CronJob("00 00 */1 * * *", () =>
      this.run().catch((error) =>
        this.logger.error("HourlyStatsCronService", "Cron run failed", { error })
      )
    ).start();
  }

  async run() {
    const counts = this.getCounts();

    const to = new Date();
    to.setMinutes(0, 0, 0);
    to.setTime(to.getTime() - 90_000);
    const from = new Date(to.getTime() - 3_600_000);

    const [resolvedCounts, summaries] = await Promise.all([
      counts,
      this.metricService.getSummaries(from, to).catch((error) => {
        this.logger.error(
          "HourlyStatsCronService",
          "Scraper metric summaries failed, sending the report without them",
          { error, from, to }
        );
        return [];
      }),
    ]);
    await this.discordService.sendHourly(resolvedCounts, summaries);
    this.logger.info("HourlyStatsCronService", "Hourly report sent", {
      counts: resolvedCounts,
      scrapers: summaries.length,
    });
  }

  private async getCounts(): Promise<HourlyReportCounts> {
    const [ruleGroups, channels, minPrices] = await Promise.all([
      this.settingService.get("countryOutlier.ruleGroups"),
      this.settingService.getChannels(),
      this.settingService.get("countryOutlier.minPrices"),
    ]);
    const channelIds = _.uniq(ruleGroups.flat().map((rule) => rule.channelId));
    const [scraped, comparable, priceDrops, channelCounts] = await Promise.all([
      this.activityCountService.getCount("ad_scraped", ...this.getLastHour()),
      this.activityCountService.getCountWithMinPrices(
        "ad_scraped",
        minPrices,
        ...this.getLastHour()
      ),
      this.getCount("price_drop_sent"),
      Promise.all(
        channelIds.map((id) => this.getCount("country_outlier_sent", String(id)))
      ),
    ]);

    return {
      scraped,
      comparable,
      minPrices,
      priceDrops,
      channels: channelIds.map((id, i) => {
        const name = channels.find((channel) => channel.id === id)?.name ?? `#${id}`;
        return { name, count: channelCounts[i] };
      }),
    };
  }

  getCount(type: BusinessLogType, channel?: string) {
    return this.businessLogService.getCount(type, ...this.getLastHour(), channel);
  }

  private getLastHour(): [Date, Date] {
    const now = new Date();
    const hoursBefore = new Date();
    hoursBefore.setHours(hoursBefore.getHours() - 1);

    return [hoursBefore, now];
  }
}
