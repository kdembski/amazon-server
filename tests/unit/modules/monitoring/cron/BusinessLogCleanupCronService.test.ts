import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { BusinessLogCleanupCronService } from "@/modules/monitoring/cron/BusinessLogCleanupCronService";
import { fakeBusinessLogService, unitLogger } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const log = fakeBusinessLogService();
  const service = new BusinessLogCleanupCronService(log.service);
  return { service, log };
};

describe("BusinessLogCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:30:00Z"));
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
    expect(unitLogger().error).toHaveBeenCalledWith("BusinessLogCleanupCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() daily at 03:30", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 30 03 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("deletes logs older than 30 days and reports the count", async () => {
    const { service, log } = setup();
    log.deleteOlderThan.mockResolvedValue(42);

    await service.run();

    const before = new Date("2026-05-02T03:30:00Z");
    expect(log.deleteOlderThan).toHaveBeenCalledWith(before);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "BusinessLogCleanupCronService",
      `Deleted 42 activity events older than ${before.toISOString()}`,
      { deleted: 42, before }
    );
  });
});
