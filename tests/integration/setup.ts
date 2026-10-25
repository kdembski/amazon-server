import "./env";
import { afterAll, beforeEach, vi } from "vitest";
import { prisma, truncateAll } from "../support/integration/db";
import { discordInbox } from "../support/integration/discordInbox";
import { PlnExchangeRateCache } from "@/modules/currency/services/PlnExchangeRateCache";
import { ActivityCounter } from "@/modules/monitoring/services/ActivityCounter";

vi.mock("discord.js", async () => {
  const { discordInbox } = await import("../support/integration/discordInbox");
  return {
    WebhookClient: class {
      private url: string;
      constructor(options: { url: string }) {
        this.url = options.url;
      }
      send(options: unknown) {
        discordInbox.push({ url: this.url, options });
        return Promise.resolve();
      }
    },
  };
});

vi.mock("@/shared/system/SystemService", () => ({
  SystemService: { getInstance: () => ({}) },
}));

beforeEach(async () => {
  await truncateAll();
  // Managers built by createApp() (via createModules()) hold the instance captured at app start, so
  // the cache is reset in place.
  PlnExchangeRateCache.getInstance().rates = undefined;
  ActivityCounter.getInstance().counts = new Map();
  discordInbox.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});
