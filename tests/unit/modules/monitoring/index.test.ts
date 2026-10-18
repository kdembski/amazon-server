import { describe, expect, it, vi } from "vitest";
import { createMonitoringModule } from "@/modules/monitoring";
import { ScraperStatusRouter } from "@/modules/monitoring/routes/ScraperStatusRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { LogCleanupCronService } from "@/modules/monitoring/cron/LogCleanupCronService";

vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

describe("createMonitoringModule", () => {
  it("exposes the scraper status router and the stats and cleanup crons", () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "t");

    const module = createMonitoringModule([]);

    expect(module.routers).toHaveLength(1);
    expect(module.routers![0]).toBeInstanceOf(ScraperStatusRouter);
    expect(module.routers![0].path).toBe("/scrapers");
    expect(module.crons!.map((c) => c.constructor)).toEqual([
      HourlyStatsCronService,
      DailyStatsCronService,
      LogCleanupCronService,
    ]);
  });
});
