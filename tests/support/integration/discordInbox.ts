export type DiscordMessage = { url: string; options: unknown };

// Filled by the WebhookClient mock in tests/integration/setup.ts, cleared
// before every test.
export const discordInbox: DiscordMessage[] = [];

export const messagesSentToToken = (token: string) =>
  discordInbox.filter((message) => message.url.endsWith(`/${token}`));
