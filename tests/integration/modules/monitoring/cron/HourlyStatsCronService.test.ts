import { describe, expect, it, vi } from "vitest";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SystemService } from "@/shared/system/SystemService";
import { messagesSentToToken } from "../../../../support/integration/discordInbox";
import {
  discordChannelToken,
  seedBusinessLog,
  seedScraperMetric,
} from "../../../../support/integration/seed";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
const countryOutlier = (channel: string, createdAt: Date) =>
  seedBusinessLog({
    type: "country_outlier_sent",
    data: { asin: "B000SEED00", channel, prices: [] },
    createdAt,
  });

describe("HourlyStatsCronService (MySQL)", () => {
  it("counts each event type and conversion channel from the last hour only, in the embed order", async () => {
    const sendHourly = vi.fn();
    const service = new HourlyStatsCronService(
      { sendHourly } as unknown as DiscordLogService
    );
    await seedBusinessLog({ type: "ad_scraped", data: { count: 3, prices: { 2: 1, 4: 1, 5: 1 } }, createdAt: minutesAgo(30) });
    await seedBusinessLog({ type: "ad_scraped", data: { count: 2 }, createdAt: minutesAgo(50) });
    await seedBusinessLog({ type: "ad_scraped", data: { count: 7, prices: { 4: 7 } }, createdAt: minutesAgo(120) });
    // A single event from before the counts
    await seedBusinessLog({ type: "ad_scraped", createdAt: minutesAgo(20) });
    await countryOutlier("1", minutesAgo(59));
    await countryOutlier("6", minutesAgo(5));
    await countryOutlier("6", minutesAgo(6));
    await countryOutlier("2", minutesAgo(90));
    await seedBusinessLog({ type: "price_drop_sent", createdAt: minutesAgo(10) });

    await service.run();

    // Channels in the order of the default rule groups
    expect(sendHourly).toHaveBeenCalledWith(
      {
        scraped: 6,
        comparable: 2,
        minPrices: 3,
        priceDrop: { name: "channel-7", count: 1 },
        channels: [3, 2, 1, 4, 5, 6].map((id) => ({
          name: `channel-${id}`,
          count: { 1: 1, 6: 2 }[id] ?? 0,
        })),
      },
      []
    );
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
      await vi.waitFor(() => expect(messagesSentToToken(discordChannelToken(8))).toHaveLength(1));
      const [message] = messagesSentToToken(discordChannelToken(8));
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
