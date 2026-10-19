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
        name: `Scrapers *(${this.getSpeedSum(summaries)}/s)*`,
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
      description: `Scraped: **${addSeparators(logs[0])}**`,
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }

  async sendDaily(sectionFields: APIEmbedField[], scraped: number) {
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
      description: `Scraped: **${addSeparators(scraped)}**`,
      fields,
    };

    return this.service.send({ embeds: [embed] });
  }

  private getSpeedIcon(speed: number) {
    if (speed <= 0.1) return "<:rd:1345009441191362613>";
    if (speed <= 1) return "<:yw:1345009442579681291>";
    return "<:gn:1345009439916294154>";
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

  private getSpeedSum(summaries: ScraperMetricSummary[]) {
    return roundToOneDecimal(
      summaries.reduce((sum, { itemsPerSecond }) => sum + itemsPerSecond, 0)
    );
  }

  private getScrapersValue(summaries: ScraperMetricSummary[]) {
    const content = summaries
      .map((summary) => {
        const { itemsPerSecond, itemsPerSecondDiff } = summary;

        return [
          [
            `${this.getSpeedIcon(itemsPerSecond)} ${summary.scraper}`,
            `**${roundToOneDecimal(itemsPerSecond)}/s** ${this.getSpeedDiff(itemsPerSecondDiff)} ${this.getSpeedDiffIcon(itemsPerSecondDiff)}`,
            summary.pending === null ? "-" : addSeparators(summary.pending),
          ].join(getSpacing(4)),
          [
            `req: **${addSeparators(summary.requests)}**`,
            `waste: **${roundToOneDecimal(summary.wastedPercent)}%**`,
            `captcha: **${roundToOneDecimal(summary.captchaPercent)}%**`,
            `KB/item: **${roundToOneDecimal(summary.kbPerItem ?? undefined)}**`,
            `reuse: **${Math.round(summary.reusePercent)}%**`,
            `tries: **${roundToOneDecimal(summary.attemptsPerItem ?? undefined)}**`,
          ].join(getSpacing(4)),
        ].join("\n");
      })
      .join("\n");

    return content.substring(0, 1023);
  }
}
