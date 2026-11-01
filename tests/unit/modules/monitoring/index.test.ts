import { describe, expect, it, vi } from "vitest";
import { createMonitoringModule } from "@/modules/monitoring";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { StatsRouter } from "@/modules/monitoring/routes/StatsRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { BusinessLogCleanupCronService } from "@/modules/monitoring/cron/BusinessLogCleanupCronService";
import { ScraperMetricCleanupCronService } from "@/modules/monitoring/cron/ScraperMetricCleanupCronService";
import { SystemLogCleanupCronService } from "@/modules/monitoring/cron/SystemLogCleanupCronService";
import { ProcessMetricsCronService } from "@/modules/monitoring/cron/ProcessMetricsCronService";
import { ActivityCountService } from "@/modules/monitoring/services/ActivityCountService";
import { DiscordLogService } from "@/modules/monitoring/services/DiscordLogService";
import { SettingService } from "@/modules/settings/services/SettingService";

vi.mock("discord.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("discord.js")>();
  return { ...original, WebhookClient: vi.fn(function () { return {}; }) };
});

describe("createMonitoringModule", () => {
  it("runs the flush and process metrics in the api and the reports and cleanups in the worker", () => {

    const module = createMonitoringModule([]);

    expect(module.routers).toHaveLength(2);
    expect(module.routers![0]).toBeInstanceOf(ScraperRouter);
    expect(module.routers![0].path).toBe("/scrapers");
    expect(module.routers![1]).toBeInstanceOf(StatsRouter);
    expect(module.crons!.map((c) => c.constructor)).toEqual([
      ActivityCountFlushCronService,
      ProcessMetricsCronService,
    ]);
    expect(module.workerCrons!.map((c) => c.constructor)).toEqual([
      HourlyStatsCronService,
      DailyStatsCronService,
      BusinessLogCleanupCronService,
      ScraperMetricCleanupCronService,
      SystemLogCleanupCronService,
      ProcessMetricsCronService,
    ]);
  });

  it("passes the sections to the daily stats cron", async () => {
    vi.spyOn(ActivityCountService.prototype, "getCount").mockResolvedValue(7);
    vi.spyOn(ActivityCountService.prototype, "getCountWithMinPrices").mockResolvedValue(3);
    vi.spyOn(SettingService.prototype, "get").mockResolvedValue(4 as never);
    const sendDaily = vi
      .spyOn(DiscordLogService.prototype, "sendDaily")
      .mockResolvedValue(undefined as never);
    const field = { name: "Section", value: "x" };
    const section = { getField: vi.fn().mockResolvedValue(field) };

    const module = createMonitoringModule([section]);
    const daily = module.workerCrons!.find(
      (c) => c instanceof DailyStatsCronService
    ) as DailyStatsCronService;
    await daily.run();

    expect(section.getField).toHaveBeenCalledTimes(1);
    expect(sendDaily).toHaveBeenCalledWith([field], 7, 3, 4);
  });
});
