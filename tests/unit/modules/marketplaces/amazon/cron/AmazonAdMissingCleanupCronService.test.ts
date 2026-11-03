import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { AmazonAdMissingCleanupCronService } from "@/modules/marketplaces/amazon/cron/AmazonAdMissingCleanupCronService";
import { AmazonAdMissingService } from "@/modules/marketplaces/amazon/services/AmazonAdMissingService";
import { unitLogger } from "../../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const deleteOlderThan = vi.fn().mockResolvedValue(0);
  const service = new AmazonAdMissingCleanupCronService({
    deleteOlderThan,
  } as unknown as AmazonAdMissingService);
  return { service, deleteOlderThan };
};

describe("AmazonAdMissingCleanupCronService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T04:00:00Z"));
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
    expect(unitLogger().error).toHaveBeenCalledWith("AmazonAdMissingCleanupCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() daily at 04:30", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("00 30 04 * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("deletes missing countries older than 30 days and reports the count", async () => {
    const { service, deleteOlderThan } = setup();
    deleteOlderThan.mockResolvedValue(42);

    await service.run();

    const before = new Date("2026-08-02T04:00:00Z");
    expect(deleteOlderThan).toHaveBeenCalledWith(before);
    expect(unitLogger().info).toHaveBeenCalledWith(
      "AmazonAdMissingCleanupCronService",
      `Deleted 42 Amazon ad missing countries older than ${before.toISOString()}`,
      { deleted: 42, before }
    );
  });
});
