import { describe, expect, it, vi } from "vitest";
import { CronJob } from "cron";
import { ProcessMetricsCronService } from "@/modules/monitoring/cron/ProcessMetricsCronService";
import { ProcessMetricsService } from "@/shared/system/ProcessMetricsService";
import { unitLogger } from "../../../../support/fakes";

vi.mock("cron", () => ({
  CronJob: vi.fn(function () {
    return { start: vi.fn() };
  }),
}));

const snapshot = {
  cpuPercent: 12,
  eventLoopDelayMs: { mean: 2.3, p99: 25.2, max: 412 },
  heapUsedMb: 300,
  rssMb: 512,
};

const setup = () => {
  const metrics = { start: vi.fn(), getSnapshot: vi.fn().mockReturnValue(snapshot) };
  const service = new ProcessMetricsCronService(
    "worker",
    metrics as unknown as ProcessMetricsService
  );
  return { service, metrics };
};

describe("ProcessMetricsCronService", () => {
  it("starts the metrics and schedules run() every minute at second 45", () => {
    const { service, metrics } = setup();
    const run = vi.spyOn(service, "run").mockResolvedValue();

    service.schedule();

    const [expression, callback] = vi.mocked(CronJob).mock
      .calls[0] as unknown as [string, () => void];
    expect(metrics.start).toHaveBeenCalled();
    expect(expression).toBe("45 * * * * *");
    callback();
    expect(run).toHaveBeenCalled();
    expect(vi.mocked(CronJob).mock.results[0].value.start).toHaveBeenCalled();
  });

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
    expect(unitLogger().error).toHaveBeenCalledWith(
      "ProcessMetricsCronService",
      "Cron run failed",
      { error }
    );
  });

  it("logs the snapshot with the role of the process", async () => {
    const { service } = setup();

    await service.run();

    expect(unitLogger().info).toHaveBeenCalledWith(
      "ProcessMetricsCronService",
      "worker: CPU 12%, event loop p99 25.2 ms, max 412 ms, heap 300 MB",
      { role: "worker", pid: process.pid, ...snapshot }
    );
  });
});
