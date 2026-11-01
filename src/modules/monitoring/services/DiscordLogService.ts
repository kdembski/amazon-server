import {
  addSeparators,
  roundToOneDecimal,
  roundToTwoDecimals,
} from "@/shared/utils/number";
import { DiscordChannelService } from "@/modules/settings/services/DiscordChannelService";
import { SettingService } from "@/modules/settings/services/SettingService";
import {
  APIEmbedField,
  MessagePayload,
  WebhookMessageCreateOptions,
} from "discord.js";
import { SystemService } from "@/shared/system/SystemService";
import { getSpacing } from "@/shared/discord/spacing";
import { ScraperMetricSummary } from "@/modules/monitoring/dtos/ScraperMetricDtos";
import { HourlyReportCounts } from "@/modules/monitoring/dtos/StatsDtos";

export class DiscordLogService {
  private service;
  private systemService;
  private settingService;

  constructor(
    service = new DiscordChannelService(),
    systemService = SystemService.getInstance(),
    settingService = new SettingService()
  ) {
    this.service = service;
    this.systemService = systemService;
    this.settingService = settingService;
  }

  async send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    const channelId = await this.settingService.get("reports.channelId");
    await this.service.send(channelId, options);
  }

  async sendHourly(counts: HourlyReportCounts, summaries: ScraperMetricSummary[]) {
    const cpu = this.systemService.getCpuUsage();
    const ram = await this.systemService.getMemoryUsage();

    const fields: APIEmbedField[] = [];

    fields.push({
      name: "Channels",
      value: [
        ...counts.channels.map(({ name, count }) => `${name}: **${count}**`),
        `hist: **${counts.priceDrops}**`,
      ].join(getSpacing(4)),
    });

    if (summaries.length) {
      fields.push({
        name: "Scrapers",
        value: this.getScrapersValue(summaries),
      });
    }

    fields.push({
      name: "Server",
      value: [`CPU: **${roundToOneDecimal(cpu)}%**`, `RAM: **${ram}%**`].join(
        getSpacing(4)
      ),
    });

    const embed = {
      title: "Hourly status",
      description: this.getScrapedDescription(
        counts.scraped,
        counts.comparable,
        counts.minPrices
      ),
      fields,
    };

    return this.send({ embeds: [embed] });
  }

  async sendDaily(
    sectionFields: APIEmbedField[],
    scraped: number,
    comparable: number,
    minPrices: number
  ) {
    const disk = await this.systemService.getDiskSpace();
    const fields: APIEmbedField[] = [...sectionFields];

    if (disk) {
      fields.push({
        name: "Server",
        value: `Disk space: **${disk.used}**/**${disk.total}** *(${disk.percentage}%)*`,
      });
    }

    const embed = {
      title: "Daily status",
      description: this.getScrapedDescription(scraped, comparable, minPrices),
      fields,
    };

    return this.send({ embeds: [embed] });
  }

  private getScrapedDescription(scraped: number, comparable: number, minPrices: number) {
    return [
      `Scraped: **${addSeparators(scraped)}**`,
      `${minPrices}+ prices: **${addSeparators(comparable)}**`,
    ].join(getSpacing(4));
  }

  private getSpeedIcon(speed: number) {
    // 0.05 is the lowest speed rendered as 0.1/s
    return speed >= 0.05
      ? "<:gn:1345009439916294154>"
      : "<:rd:1345009441191362613>";
  }

  private getSpeedDiff(diff: number) {
    if (diff > -0.01 && diff < 0.01) return "*(0.00)*";
    if (diff > 0) return `*(+${roundToTwoDecimals(diff)})*`;
    return `*(${roundToTwoDecimals(diff)})*`;
  }

  private getSpeedDiffIcon(diff: number) {
    if (diff >= 0.02) return "<:au:1369710756358258748>";
    if (diff <= -0.02) return "<:ad:1369710758241374219>";
    return `${getSpacing(3)}-${getSpacing(3)}`;
  }

  private getScrapersValue(summaries: ScraperMetricSummary[]) {
    const content = summaries
      .map((summary) => {
        const { itemsPerSecond, itemsPerSecondDiff } = summary;

        return [
          `${this.getSpeedIcon(itemsPerSecond)} ${summary.scraper}`,
          `**${roundToOneDecimal(itemsPerSecond)}/s** ${this.getSpeedDiff(itemsPerSecondDiff)} ${this.getSpeedDiffIcon(itemsPerSecondDiff)}`,
        ].join(getSpacing(4));
      })
      .join("\n");

    return content.substring(0, 1023);
  }
}
