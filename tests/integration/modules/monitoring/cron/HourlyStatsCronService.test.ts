import { describe, expect, it, vi } from "vitest";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemService } from "@/shared/system/SystemService";
import { messagesSentTo } from "../../../../support/integration/discordInbox";
import {
  seedActivityEvent,
  seedScraperMetric,
} from "../../../../support/integration/seed";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const conversionError = (channel: string, createdAt: Date) =>
  seedActivityEvent({
    type: "conversion_error_sent",
    data: { asin: "B000SEED00", channel, prices: [] },
    createdAt,
  });

describe("HourlyStatsCronService (MySQL)", () => {
  it("counts each event type and conversion channel from the last hour only, in the embed order", async () => {
    const sendHourly = vi.fn();
    const service = new HourlyStatsCronService(
      { sendHourly } as unknown as DiscordLogService
    );
    await seedActivityEvent({ type: "ad_scraped", data: { count: 3 }, createdAt: minutesAgo(30) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 2 }, createdAt: minutesAgo(50) });
    await seedActivityEvent({ type: "ad_scraped", data: { count: 7 }, createdAt: minutesAgo(120) });
    // A single event from before the counts
    await seedActivityEvent({ type: "ad_scraped", createdAt: minutesAgo(20) });
    await conversionError("1", minutesAgo(59));
    await conversionError("6", minutesAgo(5));
    await conversionError("6", minutesAgo(6));
    await conversionError("2", minutesAgo(90));
    await seedActivityEvent({ type: "pricing_error_sent", createdAt: minutesAgo(10) });

    await service.run();

    // [ad_scraped, ce1, ce2, ce3, ce4, ce5, ce6, pricing_error]
    expect(sendHourly).toHaveBeenCalledWith([6, 1, 0, 0, 0, 0, 2, 1], []);
  });

  describe("Scrapers field", () => {
    const runWithRealReport = async () => {
      const system = {
        getCpuUsage: () => 1,
        getMemoryUsage: async () => 2,
      } as unknown as SystemService;
      await new HourlyStatsCronService(
        new DiscordLogService(undefined, system)
      ).run();
      const [message] = messagesSentTo("DISCORD_LOGS_TOKEN");
      return (message.options as { embeds: [{ fields: { name: string; value: string }[] }] })
        .embeds[0].fields;
    };

    it("is built from the metrics of the last hour", async () => {
      const windowEnd = new Date();
      windowEnd.setMinutes(0, 0, 0);
      const periodStart = new Date(windowEnd.getTime() - 90_000 - 10 * 60_000);
      await seedScraperMetric({ metric: "items", outcome: "data", value: 720, periodStart });
      await seedScraperMetric({ metric: "requests", outcome: "ok", value: 1000, periodStart });

      const fields = await runWithRealReport();

      const scrapers = fields.find((f) => f.name === "Scrapers");
      expect(scrapers?.value).toContain("amazon-pdp");
      expect(scrapers?.value).toContain("**0.2/s**");
    });

    it("is absent without metrics", async () => {
      const fields = await runWithRealReport();

      expect(fields.map((f) => f.name)).toEqual(["Channels", "Server"]);
    });
  });
});
