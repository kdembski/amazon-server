import {
  MessagePayload,
  WebhookClient,
  WebhookMessageCreateOptions,
} from "discord.js";

export class DiscordService {
  private baseUrl = "https://discord.com/api/webhooks/";
  private _client?: WebhookClient;

  constructor(envVarName?: string) {
    if (!envVarName) return;
    this.client = envVarName;
  }

  send(options: string | MessagePayload | WebhookMessageCreateOptions) {
    if (!this._client) throw Error("Client has not been initialized");

    try {
      this._client.send(options);
    } catch (e) {
      console.error(e);
    }
  }

  set client(envVarName: string) {
    const token = process.env[envVarName];
    if (!token) throw Error(`${envVarName} env variable is missing`);

    this._client = new WebhookClient({
      url: this.baseUrl + token,
    });
  }
}
