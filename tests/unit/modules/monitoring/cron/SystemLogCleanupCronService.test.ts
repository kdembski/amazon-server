import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { SystemLogCleanupCronService } from "@/modules/monitoring/cron/SystemLogCleanupCronService";
import { fakeSystemLogService } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const logger = fakeSystemLogService();
  const service = new SystemLogCleanupCronService(logger.service);
  return { service, logger };
};

describe("SystemLogCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T04:15:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("schedules run() daily at 04:15", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 15 04 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("logs a failed run", async () => {
    const { service, logger } = setup();
    const error = new Error("boom");
    vi.spyOn(service, "run").mockRejectedValue(error);

    service.schedule();

    const [, callback] = vi.mocked(CronJob).mock.calls[0] as unknown as [
      string,
      () => Promise<void>,
    ];
    await callback();
    expect(logger.error).toHaveBeenCalledWith(
      "SystemLogCleanupCronService",
      "Cron run failed",
      { error }
    );
  });

  it("deletes system logs older than 30 days and reports the count", async () => {
    const { service, logger } = setup();
    logger.deleteOlderThan.mockResolvedValue(42);

    await service.run();

    const before = new Date("2026-05-02T04:15:00Z");
    expect(logger.deleteOlderThan).toHaveBeenCalledWith(before);
    expect(logger.info).toHaveBeenCalledWith(
      "SystemLogCleanupCronService",
      `Deleted 42 system logs older than ${before.toISOString()}`,
      { deleted: 42, before }
    );
  });
});
