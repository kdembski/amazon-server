import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { ScraperMetricCleanupCronService } from "@/modules/monitoring/cron/ScraperMetricCleanupCronService";
import { fakeScraperMetricService } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const metrics = fakeScraperMetricService();
  const service = new ScraperMetricCleanupCronService(metrics.service);
  return { service, metrics };
};

describe("ScraperMetricCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:45:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("schedules run() daily at 03:45", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 45 03 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("deletes scraper metrics older than 30 days and reports the count", async () => {
    const { service, metrics } = setup();
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    metrics.deleteOlderThan.mockResolvedValue(42);

    await service.run();

    const before = new Date("2026-05-02T03:45:00Z");
    expect(metrics.deleteOlderThan).toHaveBeenCalledWith(before);
    expect(info).toHaveBeenCalledWith(
      `Deleted 42 scraper metrics older than ${before.toISOString()}`
    );
  });
});
