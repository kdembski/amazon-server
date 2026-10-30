import {
  APIEmbed,
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

const MAX_EMBED_TITLE_LENGTH = 256;

export class DiscordService {
  private baseUrl = "https://discord.com/api/webhooks/";
  private _client?: WebhookClient;
  private envVarName?: string;
  private retryDelays;
  private logger;

  constructor(
    envVarName?: string,
    retryDelays = [5_000, 15_000, 45_000, 120_000, 300_000, 900_000],
    logger = SystemLogService.getInstance()
  ) {
    this.retryDelays = retryDelays;
    this.logger = logger;
    if (!envVarName) return;
    this.client = envVarName;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    if (!this._client) throw Error("Client has not been initialized");

    return this.sendWithRetry(this._client, this.truncateTitles(options));
  }

  set client(envVarName: string) {
    const token = process.env[envVarName];
    if (!token) throw Error(`${envVarName} env variable is missing`);

    this.envVarName = envVarName;
    // discord.js would silently resend after a timeout, ECONNRESET or 5xx, duplicating messages Discord already published.
    this._client = new WebhookClient(
      { url: this.baseUrl + token },
      { rest: { retries: 0, timeout: 60_000 } }
    );
  }

  private async sendWithRetry(
    client: WebhookClient,
    options: string | MessagePayload | WebhookMessageCreateOptions,
    attempt = 0
  ): Promise<void> {
    try {
      await client.send(options);
    } catch (e) {
      const delay = this.retryDelays[attempt];
      const context = {
        error: e,
        webhook: this.envVarName,
        attempt: attempt + 1,
        payload: this.summarize(options),
      };

      if (delay === undefined) {
        this.logger.error(
          "DiscordService",
          "Discord message was not sent after all retries",
          context
        );
        return;
      }

      this.logger.warn("DiscordService", "Discord send failed, retrying", {
        ...context,
        retryInMs: delay,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.sendWithRetry(client, options, attempt + 1);
    }
  }

  // Discord rejects the whole message when an embed title is longer than 256 characters.
  private truncateTitles(
    options: string | MessagePayload | WebhookMessageCreateOptions
  ) {
    if (typeof options === "string") return options;

    const { embeds } = options as WebhookMessageCreateOptions;
    if (!embeds) return options;

    return {
      ...options,
      embeds: embeds.map((embed) => {
        const { title } = embed as APIEmbed;
        if (!title || title.length <= MAX_EMBED_TITLE_LENGTH) return embed;
        return { ...embed, title: title.slice(0, MAX_EMBED_TITLE_LENGTH - 1) + "…" };
      }),
    } as WebhookMessageCreateOptions;
  }

  private summarize(
    options: string | MessagePayload | WebhookMessageCreateOptions
  ) {
    if (typeof options === "string") return { content: options };

    const { content, embeds } = options as WebhookMessageCreateOptions;
    return {
      content,
      embedTitles: embeds?.map((embed) => (embed as APIEmbed).title),
    };
  }
}
