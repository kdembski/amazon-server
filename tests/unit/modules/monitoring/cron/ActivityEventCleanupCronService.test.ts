import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { ActivityEventCleanupCronService } from "@/modules/monitoring/cron/ActivityEventCleanupCronService";
import { fakeActivityEventService } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const log = fakeActivityEventService();
  const service = new ActivityEventCleanupCronService(log.service);
  return { service, log };
};

describe("ActivityEventCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T03:30:00Z"));
  });
  afterEach(() => vi.useRealTimers());

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
    const info = vi.spyOn(console, "log").mockImplementation(() => {});
    log.deleteOlderThan.mockResolvedValue(42);

    await service.run();

    const before = new Date("2026-05-02T03:30:00Z");
    expect(log.deleteOlderThan).toHaveBeenCalledWith(before);
    expect(info).toHaveBeenCalledWith(
      `Deleted 42 logs older than ${before.toISOString()}`
    );
  });
});
