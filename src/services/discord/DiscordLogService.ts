import { DiscordService } from "@/services/discord/DiscordService";
import { MessagePayload, WebhookMessageCreateOptions } from "discord.js";

export class DiscordLogService {
  private service;

  constructor(service = new DiscordService()) {
    const token = process.env.DISCORD_CONVERSION_ERROR_TOKEN;

    if (!token)
      throw Error("DISCORD_CONVERSION_ERROR_TOKEN env variable is missing");

    service.init(token);
    this.service = service;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    this.service.send(options);
  }
}
