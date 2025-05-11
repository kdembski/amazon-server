import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import {
  addSeparators,
  roundToOneDecimal,
  roundToTwoDecimals,
} from "@/helpers/number";
import { DiscordService } from "@/services/discord/DiscordService";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import {
  APIEmbedField,
  MessagePayload,
  WebhookMessageCreateOptions,
} from "discord.js";
import { SystemService } from "@/services/SystemService";

export class DiscordLogService {
  private service;
  private scrapersStatusService;
  private systemService;

  constructor(
    service = new DiscordService("DISCORD_LOGS_TOKEN"),
    scrapersStatusService = ScrapersStatusService.getInstance(),
    systemService = SystemService.getInstance()
  ) {
    this.service = service;
    this.scrapersStatusService = scrapersStatusService;
    this.systemService = systemService;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    this.service.send(options);
  }

  async sendHourly(logs: number[]) {
    const statuses = this.getScraperStatuses();
    const speedSum = this.getScrapersSpeedSum();
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
      ].join(this.getSpacing(4)),
    });

    if (statuses) {
      fields.push({
        name: `Scrapers ${speedSum ? `*(${speedSum.toFixed(1)}/s)*` : ""}`,
        value: statuses,
      });
    }

    fields.push({
      name: "Server",
      value: [`CPU: **${cpu}%**`, `RAM: **${ram}%**`].join(this.getSpacing(4)),
    });

    const embed = {
      title: "Hourly status",
      description: `Scraped: **${addSeparators(logs[0])}**`,
      fields,
    };

    this.service.send({ embeds: [embed] });
  }

  async sendDaily(
    adsCount: { total: number; today: number },
    rates: CurrencyExchangeRateSelectDto[],
    scraped: number
  ) {
    const disk = await this.systemService.getDiskSpace();
    const fields: APIEmbedField[] = [];

    fields.push({
      name: "Collected asins",
      value: [
        `Total: **${addSeparators(adsCount.total)}**`,
        `Last 24h: **${addSeparators(adsCount.today)}**`,
      ].join(this.getSpacing(4)),
    });

    fields.push({
      name: "Exchange rates",
      value: rates
        .map(
          (rate) =>
            `${rate.source.code} -> ${rate.target.code}: **${rate.value}**`
        )
        .join(this.getSpacing(4)),
    });

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

    this.service.send({ embeds: [embed] });
  }

  private getSpeedIcon(speed: number) {
    if (speed <= 0.1) return "<:red:1345009441191362613>";
    if (speed <= 1) return "<:yellow:1345009442579681291>";
    return "<:green:1345009439916294154>";
  }

  private getSpeedDiff(diff: number) {
    if (diff > 0) return `*(+${roundToTwoDecimals(diff).toFixed(2)})*`;
    return `*(${roundToTwoDecimals(diff).toFixed(2)})*`;
  }

  private getSpeedDiffIcon(diff: number) {
    if (diff >= 0.02) return "<:arrow_up:1369710756358258748>";
    if (diff <= -0.02) return "<:arrow_down:1369710758241374219>";
    return `${this.getSpacing(2)}-${this.getSpacing(2)}`;
  }

  private getScrapersSpeedSum() {
    const statuses = Object.values(this.scrapersStatusService.statuses);
    if (!statuses?.length) return;

    const sum = statuses.reduce((accum: number, status) => {
      return (accum += status.speed);
    }, 0);
    return roundToOneDecimal(sum);
  }

  private getScraperStatuses() {
    const statuses = Object.values(this.scrapersStatusService.statuses);
    if (!statuses?.length) return;

    statuses.sort((a, b) => (a.name > b.name ? 1 : -1));

    return statuses
      .map((status) => {
        const { name, speed, pending, speedDiff, cpu } = status;
        const speedDiffValue = this.getSpeedDiff(speedDiff);
        const speedDiffIcon = this.getSpeedDiffIcon(speedDiff);
        const speedValue = `**${roundToOneDecimal(speed).toFixed(1)}/s**`;

        return [
          `${this.getSpeedIcon(speed)} ${name}`,
          `${speedValue} ${speedDiffValue} ${speedDiffIcon}`,
          `${addSeparators(pending)}`,
          `${Math.round(cpu)} %`,
        ].join(this.getSpacing(4));
      })
      .join("\n");
  }

  private getSpacing(i: number) {
    return new Array(i).fill("‎").join(" ");
  }
}
