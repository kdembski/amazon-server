import { describe, expect, it, vi } from "vitest";
import { createMonitoringModule } from "@/modules/monitoring";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { StatsRouter } from "@/modules/monitoring/routes/StatsRouter";
import { HourlyStatsCronService } from "@/modules/monitoring/cron/HourlyStatsCronService";
import { DailyStatsCronService } from "@/modules/monitoring/cron/DailyStatsCronService";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { ScraperMetricRollupCronService } from "@/modules/monitoring/cron/ScraperMetricRollupCronService";
import { RetentionCleanupCronService } from "@/shared/system/RetentionCleanupCronService";
import { BusinessLogService } from "@/modules/monitoring/services/BusinessLogService";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";
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
    const cleanups = module.workerCrons!.filter((c) => c instanceof RetentionCleanupCronService);
    expect(
      cleanups.map((c) => [c["cronTime"], c["label"], c["retentionDays"], c["target"].constructor])
    ).toEqual([
      ["00 30 03 * * *", "activity events", 30, BusinessLogService],
      ["00 45 03 * * *", "scraper metrics", 30, ScraperMetricService],
      ["00 15 04 * * *", "system logs", 30, SystemLogService.getInstance().constructor],
    ]);
    expect(module.workerCrons!.map((c) => c.constructor)).toEqual([
      HourlyStatsCronService,
      DailyStatsCronService,
      RetentionCleanupCronService,
      RetentionCleanupCronService,
      ScraperMetricRollupCronService,
      RetentionCleanupCronService,
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
