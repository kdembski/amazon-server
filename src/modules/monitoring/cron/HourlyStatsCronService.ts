import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { HourlyReportCounts } from "@/modules/monitoring/dtos/StatsDtos";
import { BusinessLogType } from "@prisma/client";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
import { SettingService } from "@/modules/settings/services/SettingService";
import { floorHour, HOUR_MS } from "@/modules/monitoring/helpers/hours";
import { TimeRange } from "@/modules/monitoring/interfaces/TimeRange";
import { CronService } from "@/shared/system/CronService";

export class HourlyStatsCronService extends CronService {
  protected readonly cronTime = "00 00 */1 * * *";
  private discordService;
  private businessLogService;
  private metricService;
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
    super(logger);
    this.discordService = discordService;
    this.businessLogService = businessLogService;
    this.metricService = metricService;
    this.activityCountService = activityCountService;
    this.settingService = settingService;
  }

  async run() {
    const now = new Date();
    const counts = this.getCounts({ from: new Date(now.getTime() - HOUR_MS), to: now });

    // The scraper metrics of the last 90 s of the hour may not have arrived yet
    const to = new Date(floorHour(now).getTime() - 90_000);
    const from = new Date(to.getTime() - HOUR_MS);

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

  private async getCounts({ from, to }: TimeRange): Promise<HourlyReportCounts> {
    const [channels, minPrices, priceDropChannelId] = await Promise.all([
      this.settingService.getCountryOutlierChannels(),
      this.settingService.get("countryOutlier.minPrices"),
      this.settingService.get("priceDrop.channelId"),
    ]);
    const getSent = (type: BusinessLogType, channel?: string) => {
      return this.businessLogService.getCount(type, from, to, channel);
    };
    const [scraped, comparable, priceDrops, channelCounts, priceDropName] = await Promise.all([
      this.activityCountService.getCount("ad_scraped", from, to),
      minPrices === undefined
        ? undefined
        : this.activityCountService.getCountWithMinPrices("ad_scraped", minPrices, from, to),
      getSent("price_drop_sent"),
      Promise.all(channels.map(({ id }) => getSent("country_outlier_sent", String(id)))),
      priceDropChannelId === undefined ? undefined : this.settingService.getChannelName(priceDropChannelId),
    ]);

    return {
      scraped,
      comparable,
      minPrices,
      priceDrop: priceDropName === undefined ? undefined : { name: priceDropName, count: priceDrops },
      channels: channels.map(({ name }, i) => ({ name, count: channelCounts[i] })),
    };
  }
}
