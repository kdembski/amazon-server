import "./env";
import { afterAll, beforeEach, vi } from "vitest";
import { prisma, truncateAll } from "../support/integration/db";
import { discordInbox } from "../support/integration/discordInbox";
import { StorageService } from "@/services/StorageService";

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

vi.mock("@/services/SystemService", () => ({
  SystemService: { getInstance: () => ({}) },
}));

beforeEach(async () => {
  await truncateAll();
  // Managers built by useRouter() hold the instance captured at app start, so
  // the state is reset in place.
  StorageService.getInstance().state = {};
  discordInbox.length = 0;
});

afterAll(async () => {
  await prisma.$disconnect();
});
