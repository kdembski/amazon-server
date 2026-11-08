import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { CronService } from "@/shared/system/CronService";
import { fakeSystemLogService } from "../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

class TestCronService extends CronService {
  protected readonly cronTime = "00 10 * * * *";
  run = vi.fn().mockResolvedValue(undefined);
}

const getCallback = () => {
  return vi.mocked(CronJob).mock.calls.at(-1)![1] as unknown as () => Promise<void>;
};

describe("CronService", () => {
  it("schedules run() at the cron time and starts the job", async () => {
    const service = new TestCronService(fakeSystemLogService().service);

    service.schedule();

    expect(vi.mocked(CronJob).mock.calls.at(-1)![0]).toBe("00 10 * * * *");
    await getCallback()();
    expect(service.run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results.at(-1)!.value.start).toHaveBeenCalled();
  });

  it("logs a failed run under the class name", async () => {
    const logger = fakeSystemLogService();
    const service = new TestCronService(logger.service);
    const error = new Error("boom");
    service.run.mockRejectedValue(error);

    service.schedule();
    await getCallback()();

    expect(logger.error).toHaveBeenCalledWith("TestCronService", "Cron run failed", { error });
  });
});
