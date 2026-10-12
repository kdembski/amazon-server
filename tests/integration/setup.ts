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

vi.mock("pm2", () => ({
  default: {
    list: (callback: (error: Error | null, list: never[]) => void) =>
      callback(null, []),
  },
}));

vi.mock("node-os-utils", () => ({
  default: {
    cpu: { usage: () => Promise.resolve(0) },
    mem: { used: () => Promise.resolve({ totalMemMb: 100, usedMemMb: 50 }) },
    drive: {
      info: () =>
        Promise.resolve({ usedGb: 1, totalGb: 10, usedPercentage: 10 }),
    },
  },
}));

vi.mock("hercai", () => ({
  Hercai: class {
    question() {
      return Promise.resolve({ reply: "" });
    }
  },
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
