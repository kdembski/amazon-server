import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import { addSeparators } from "@/helpers/number";
import { DiscordService } from "@/services/discord/DiscordService";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import { MessagePayload, WebhookMessageCreateOptions } from "discord.js";
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
    const speeds = this.getScraperSpeeds();
    const cpu = await this.systemService.getCpuUsage();
    const ram = await this.systemService.getMemoryUsage();

    const embed = {
      title: "Hourly status",
      description: `Scraped: **${addSeparators(logs[0])}**`,
      fields: [
        {
          name: "Channels",
          value: [
            `50%: **${logs[1]}**`,
            `70%: **${logs[2]}**`,
            `90%: **${logs[3]}**`,
            `0-50: **${logs[4]}**`,
            `50-200: **${logs[5]}**`,
            `200+: **${logs[6]}**`,
            `hist: **${logs[7]}**`,
          ].join(this.getSpacing()),
        },
        ...(speeds ? [{ name: "Scrapers", value: speeds }] : []),
        {
          name: "System",
          value: [`CPU: **${cpu}%**`, `RAM: **${ram}%**`].join(
            this.getSpacing()
          ),
        },
      ],
    };

    this.service.send({ embeds: [embed] });
  }

  sendDaily(
    adsCount: { total: number; today: number },
    rates: CurrencyExchangeRateSelectDto[],
    scraped: number
  ) {
    const embed = {
      title: "Daily status",
      description: `Scraped: **${addSeparators(scraped)}**`,
      fields: [
        {
          name: "Collected asins",
          value: [
            `Total: **${addSeparators(adsCount.total)}**`,
            `Last 24h: **${addSeparators(adsCount.today)}**`,
          ].join(this.getSpacing()),
        },
        {
          name: "Exchange rates",
          value: rates
            .map(
              (rate) =>
                `${rate.source.code} -> ${rate.target.code}: **${rate.value}**`
            )
            .join(this.getSpacing()),
        },
      ],
    };

    this.service.send({ embeds: [embed] });
  }

  private getSpeedIcon(speed: number) {
    if (speed === 0) return "<:red:1345009441191362613>";
    if (speed === 1) return "<:yellow:1345009442579681291>";
    return "<:green:1345009439916294154>";
  }

  private getScraperSpeeds() {
    const speeds = Object.entries(this.scrapersStatusService.speeds);
    if (!speeds?.length) return;

    speeds.sort();
    const lines: string[] = [];

    for (let i = 0; i < speeds.length; i += 4) {
      const line = speeds
        .slice(i, i + 4)
        .map(
          ([name, speed]) =>
            `${this.getSpeedIcon(speed)} ${name} **(${(
              Math.round(speed * 10) / 10
            ).toFixed(1)}/s)**`
        )
        .join(this.getSpacing());

      lines.push(line);
    }

    return lines.join("\n");
  }

  private getSpacing() {
    return "‎ ‎ ‎ ‎";
  }
}
