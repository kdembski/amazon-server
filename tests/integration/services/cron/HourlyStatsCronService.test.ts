import { describe, expect, it, vi } from "vitest";
import { HourlyStatsCronService } from "@/services/cron/HourlyStatsCronService";
import { DiscordLogService } from "@/services/discord/DiscordLogService";
import { seedLog } from "../../../support/integration/seed";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("HourlyStatsCronService (MySQL)", () => {
  it("counts each event from the last hour only, in the embed order", async () => {
    const sendHourly = vi.fn();
    const service = new HourlyStatsCronService(
      { sendHourly } as unknown as DiscordLogService
    );
    await seedLog({ event: "ad_scraped", createdAt: minutesAgo(30) });
    await seedLog({ event: "ad_scraped", createdAt: minutesAgo(120) });
    await seedLog({ event: "conversion_error_2_sent", createdAt: minutesAgo(59) });
    await seedLog({ event: "pricing_error_sent", createdAt: minutesAgo(10) });

    await service.run();

    // [ad_scraped, ce1, ce2, ce3, ce4, ce5, ce6, pricing_error]
    expect(sendHourly).toHaveBeenCalledWith([1, 0, 1, 0, 0, 0, 0, 1]);
  });
});
