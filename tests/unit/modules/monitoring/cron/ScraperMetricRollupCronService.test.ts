import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { ScraperMetricRollupCronService } from "@/modules/monitoring/cron/ScraperMetricRollupCronService";
import { ScraperMetricRollupService } from "@/modules/monitoring/services/ScraperMetricRollupService";
import { unitLogger } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const metrics = { rollUp: vi.fn().mockResolvedValue(0) };
  const service = new ScraperMetricRollupCronService(metrics as unknown as ScraperMetricRollupService);
  return { service, metrics };
};

describe("ScraperMetricRollupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:05:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("logs a failed run", async () => {
    const { service } = setup();
    const error = new Error("boom");
    vi.spyOn(service, "run").mockRejectedValue(error);

    service.schedule();

    const [, callback] = vi.mocked(CronJob).mock.calls[0] as unknown as [
      string,
      () => Promise<void>,
    ];
    await callback();
    expect(unitLogger().error).toHaveBeenCalledWith("ScraperMetricRollupCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() at minute 5 of every hour", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock.calls[0] as unknown as [
      string,
      () => void,
    ];
    expect(expression).toBe("00 05 * * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("rolls up the metrics up to now and reports the hours", async () => {
    const { service, metrics } = setup();
    metrics.rollUp.mockResolvedValue(3);

    await service.run();

    expect(metrics.rollUp).toHaveBeenCalledWith(new Date("2026-06-01T03:05:00Z"));
    expect(unitLogger().info).toHaveBeenCalledWith(
      "ScraperMetricRollupCronService",
      "Rolled up 3 hours of scraper metrics",
      { hours: 3 }
    );
  });
});
