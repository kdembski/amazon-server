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
    this.service.send(
      `scraped: ${logs[0]} | 60%: ${logs[1]} | 80%: ${logs[2]} | 0-50: ${logs[3]} | 50-200: ${logs[4]} | 200-*: ${logs[5]} | hist: ${logs[6]}`
    );
    this.service.send(
      Object.entries(this.scrapersStatusService.speeds)
        .map(([name, speed]) => `${name}: ${speed}/s`)
        .join(" | ")
    );
  }
}
