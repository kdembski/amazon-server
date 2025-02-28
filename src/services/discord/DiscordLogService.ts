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

  getSpeedIcon(speed: number) {
    if (speed === 0) return "🔴";
    if (speed === 1) return "🟡";
    return "🟢";
  }

  getSpacing() {
    return "‎ ‎ ‎ ‎";
  }
}
