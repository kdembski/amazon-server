import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { ActivityCountFlushCronService } from "@/modules/monitoring/cron/ActivityCountFlushCronService";
import { fakeActivityCountService, unitLogger } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const setup = () => {
  const counter = fakeActivityCountService();
  const service = new ActivityCountFlushCronService(counter.service);
  return { service, counter };
};

describe("ActivityCountFlushCronService", () => {
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
    expect(unitLogger().error).toHaveBeenCalledWith("ActivityCountFlushCronService", "Cron run failed", {
      error,
    });
  });

  it("schedules run() every minute at second 30", () => {
    const { service } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(expression).toBe("30 * * * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

  it("flushes the counts", async () => {
    const { service, counter } = setup();

    await service.run();

    expect(counter.flush).toHaveBeenCalled();
  });
});
