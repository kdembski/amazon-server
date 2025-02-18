import { DiscordService } from "@/services/discord/DiscordService";
import { MessagePayload, WebhookMessageCreateOptions } from "discord.js";

export class DiscordLogService {
  private service;

  constructor(service = new DiscordService("DISCORD_LOGS_TOKEN")) {
    this.service = service;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    this.service.send(options);
  }
}
