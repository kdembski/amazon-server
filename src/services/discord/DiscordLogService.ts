import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import { addSeparators } from "@/helpers/number";
import { DiscordService } from "@/services/discord/DiscordService";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import { MessagePayload, WebhookMessageCreateOptions } from "discord.js";

export class DiscordLogService {
  private service;
  private scrapersStatusService;

  constructor(
    service = new DiscordService("DISCORD_LOGS_TOKEN"),
    scrapersStatusService = ScrapersStatusService.getInstance()
  ) {
    this.service = service;
    this.scrapersStatusService = scrapersStatusService;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    this.service.send(options);
  }

  sendHourly(logs: number[]) {
    const embed = {
      title: "Hourly status",
      description: `Scraped: **${logs[0]}**`,
      fields: [
        {
          name: "Channels",
          value: [
            `70%: **${logs[1]}**`,
            `90%: **${logs[2]}**`,
            `0-50: **${logs[3]}**`,
            `50-200: **${logs[4]}**`,
            `200+: **${logs[5]}**`,
            `hist: **${logs[6]}**`,
          ].join(this.getSpacing()),
        },
        {
          name: "Scrapers",
          value: Object.entries(this.scrapersStatusService.speeds)
            .sort()
            .map(
              ([name, speed]) =>
                `${this.getSpeedIcon(speed)} ${name} **(${speed}/s)**`
            )
            .join(this.getSpacing()),
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
      description: `Scraped: **${scraped}**`,
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

  private getSpacing() {
    return "‎ ‎ ‎ ‎";
  }
}
