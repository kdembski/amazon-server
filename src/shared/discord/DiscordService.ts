import {
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";

export class DiscordService {
  private baseUrl = "https://discord.com/api/webhooks/";
  private _client?: WebhookClient;
  private retryDelays;

  constructor(envVarName?: string, retryDelays = [5_000, 15_000, 45_000]) {
    this.retryDelays = retryDelays;
    if (!envVarName) return;
    this.client = envVarName;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    if (!this._client) throw Error("Client has not been initialized");

    return this.sendWithRetry(this._client, options);
  }

  set client(envVarName: string) {
    const token = process.env[envVarName];
    if (!token) throw Error(`${envVarName} env variable is missing`);

    this._client = new WebhookClient({
      url: this.baseUrl + token,
    });
  }

  private async sendWithRetry(
    client: WebhookClient,
    options: string | MessagePayload | WebhookMessageCreateOptions,
    attempt = 0
  ): Promise<void> {
    try {
      await client.send(options);
    } catch (e) {
      console.error(e);
      const delay = this.retryDelays[attempt];
      if (delay === undefined) return;

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.sendWithRetry(client, options, attempt + 1);
    }
  }
}
