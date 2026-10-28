import {
  addSeparators,
  roundToOneDecimal,
  roundToTwoDecimals,
} from "@/shared/utils/number";
import { DiscordService } from "@/shared/discord/DiscordService";
import {
  APIEmbedField,
  MessagePayload,
  WebhookMessageCreateOptions,
} from "discord.js";
import { SystemService } from "@/shared/system/SystemService";
import { getSpacing } from "@/shared/discord/spacing";
import { MIN_COUNTRY_OUTLIER_PRICES } from "@/shared/utils/countryOutlier";
import { ScraperMetricSummary } from "@/modules/monitoring/dtos/ScraperMetricDtos";

export class DiscordLogService {
  private service;
  private systemService;

  constructor(
    service = new DiscordService("DISCORD_LOGS_TOKEN"),
    systemService = SystemService.getInstance()
  ) {
    this.service = service;
    this.systemService = systemService;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    return this.service.send(options);
  }

  async sendHourly(logs: number[], summaries: ScraperMetricSummary[]) {
    const cpu = this.systemService.getCpuUsage();
    const ram = await this.systemService.getMemoryUsage();

    const fields: APIEmbedField[] = [];

    fields.push({
      name: "Channels",
      value: [
        `50%: **${logs[1]}**`,
        `70%: **${logs[2]}**`,
        `90%: **${logs[3]}**`,
        `0-50: **${logs[4]}**`,
        `50-200: **${logs[5]}**`,
        `200+: **${logs[6]}**`,
        `hist: **${logs[7]}**`,
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
      description: this.getScrapedDescription(logs[0], logs[8]),
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }

  async sendDaily(sectionFields: APIEmbedField[], scraped: number, comparable: number) {
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
      description: this.getScrapedDescription(scraped, comparable),
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }

  private getScrapedDescription(scraped: number, comparable: number) {
    return [
      `Scraped: **${addSeparators(scraped)}**`,
      `${MIN_COUNTRY_OUTLIER_PRICES}+ prices: **${addSeparators(comparable)}**`,
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
