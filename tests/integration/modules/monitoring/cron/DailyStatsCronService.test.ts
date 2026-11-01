import { describe, expect, it, vi } from "vitest";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { AmazonAdDailyReportSection } from "@/modules/marketplaces/amazon/services/AmazonAdDailyReportSection";
import { ExchangeRateDailyReportSection } from "@/modules/currency/services/ExchangeRateDailyReportSection";
import { getSpacing } from "@/shared/discord/spacing";
import {
  seedAd,
  seedCurrency,
  seedBusinessLog,
  seedPln,
  seedRate,
} from "../../../../support/integration/seed";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

describe("DailyStatsCronService (MySQL)", () => {
  it("reports total/24h ad counts, PLN rates without PLN->PLN and the scraped count", async () => {
    const sendDaily = vi.fn();
    // Default AmazonAdService: real repositories; Discord senders inside it
    // hit the WebhookClient mock from setup.ts.
    const service = new DailyStatsCronService(
      [
        new AmazonAdDailyReportSection(),
        new ExchangeRateDailyReportSection(),
      ],
      { sendDaily } as unknown as DiscordLogService
    );
    await seedAd({ createdAt: hoursAgo(1) });
    await seedAd({ createdAt: hoursAgo(48) });
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    await seedRate({ sourceId: eur.id, targetId: pln.id, value: 4.3 });
    await seedRate({ sourceId: pln.id, targetId: pln.id, value: 1 });
    await seedBusinessLog({ type: "ad_scraped", data: { count: 4, prices: { 2: 1, 4: 2, 6: 1 } }, createdAt: hoursAgo(2) });
    await seedBusinessLog({ type: "ad_scraped", data: { count: 9 }, createdAt: hoursAgo(30) });

    await service.run();

    expect(sendDaily).toHaveBeenCalledWith(
      [
        {
          name: "Collected asins",
          value: ["Total: **2**", "Last 24h: **1**"].join(getSpacing(4)),
        },
        { name: "Exchange rates", value: "EUR -> PLN: **4.3**" },
      ],
      4,
      3,
      3
    );
  });
});
