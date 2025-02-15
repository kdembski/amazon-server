import {
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";
import { format } from "date-fns";
import {
  AmazonAdPriceCreateDto,
  AmazonAdPriceSelectDto,
} from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdSelectDto } from "@/dtos/amazon/AmazonAdDtos";

export class DiscordService {
  private baseUrl = "https://discord.com/api/webhooks/";
  client?: WebhookClient;

  constructor() {}

  init(token: string) {
    this.client = new WebhookClient({
      url: this.baseUrl + token,
    });
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    if (!this.client) throw Error("Client has not been initialized");

    try {
      this.client.send(options);
    } catch (e) {
      console.error(e);
    }
  }
}
