import { describe, expect, it, vi } from "vitest";
import { DailyStatsCronService } from "@/services/cron/DailyStatsCronService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { CurrencyExchangeRateSelectDto } from "@/dtos/currency/CurrencyExchangeRateDtos";
import {
  seedAd,
  seedCurrency,
  seedLog,
  seedPln,
  seedRate,
} from "../../../support/integration/seed";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

describe("DailyStatsCronService (MySQL)", () => {
  it("reports total/24h ad counts, PLN rates without PLN->PLN and the scraped count", async () => {
    const sendDaily = vi.fn();
    // Default AmazonAdService: real repositories; Discord senders inside it
    // hit the WebhookClient mock from setup.ts.
    const service = new DailyStatsCronService(
      { sendDaily } as unknown as DiscordLogService
    );
    await seedAd({ createdAt: hoursAgo(1) });
    await seedAd({ createdAt: hoursAgo(48) });
    const pln = await seedPln();
    const eur = await seedCurrency({ code: "EUR" });
    await seedRate({ sourceId: eur.id, targetId: pln.id, value: 4.3 });
    await seedRate({ sourceId: pln.id, targetId: pln.id, value: 1 });
    await seedLog({ event: "ad_scraped", createdAt: hoursAgo(2) });
    await seedLog({ event: "ad_scraped", createdAt: hoursAgo(30) });

    await service.run();

    const [adsCount, rates, scraped] = sendDaily.mock.calls[0] as [
      { total: number; today: number },
      CurrencyExchangeRateSelectDto[],
      number
    ];
    expect(adsCount).toEqual({ total: 2, today: 1 });
    expect(rates.map((r) => [r.source.code, r.value.toNumber()])).toEqual([["EUR", 4.3]]);
    expect(scraped).toBe(1);
  });
});
