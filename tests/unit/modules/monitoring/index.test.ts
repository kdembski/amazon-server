import { describe, expect, it, vi } from "vitest";
import { createMonitoringModule } from "@/modules/monitoring";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { ScraperMetricCleanupCronService } from "@/modules/monitoring/cron/ScraperMetricCleanupCronService";
import { ActivityEventService } from "@/modules/monitoring/services/ActivityEventService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";

vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

describe("createMonitoringModule", () => {
  it("exposes the scraper router and the stats and cleanup crons", () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "t");

    const module = createMonitoringModule([]);

    expect(module.routers).toHaveLength(1);
    expect(module.routers![0]).toBeInstanceOf(ScraperRouter);
    expect(module.routers![0].path).toBe("/scrapers");
    expect(module.crons!.map((c) => c.constructor)).toEqual([
      HourlyStatsCronService,
      DailyStatsCronService,
      ActivityEventCleanupCronService,
      ScraperMetricCleanupCronService,
    ]);
  });

  it("passes the sections to the daily stats cron", async () => {
    vi.stubEnv("DISCORD_LOGS_TOKEN", "t");
    vi.spyOn(ActivityEventService.prototype, "getCount").mockResolvedValue(7);
    const sendDaily = vi
      .spyOn(DiscordLogService.prototype, "sendDaily")
      .mockResolvedValue(undefined as never);
    const field = { name: "Section", value: "x" };
    const section = { getField: vi.fn().mockResolvedValue(field) };

    const module = createMonitoringModule([section]);
    const daily = module.crons!.find(
      (c) => c instanceof DailyStatsCronService
    ) as DailyStatsCronService;
    await daily.run();

    expect(section.getField).toHaveBeenCalledTimes(1);
    expect(sendDaily).toHaveBeenCalledWith([field], 7);
  });
});
