import { describe, expect, it, vi } from "vitest";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { seedActivityEvent } from "../../../../support/integration/seed";

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
    await seedActivityEvent({ type: "ad_scraped", createdAt: minutesAgo(30) });
    await seedActivityEvent({ type: "ad_scraped", createdAt: minutesAgo(120) });
    await conversionError("1", minutesAgo(59));
    await conversionError("6", minutesAgo(5));
    await conversionError("6", minutesAgo(6));
    await conversionError("2", minutesAgo(90));
    await seedActivityEvent({ type: "pricing_error_sent", createdAt: minutesAgo(10) });

    await service.run();

    // [ad_scraped, ce1, ce2, ce3, ce4, ce5, ce6, pricing_error]
    expect(sendHourly).toHaveBeenCalledWith([1, 1, 0, 0, 0, 0, 2, 1]);
  });
});
