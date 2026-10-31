import { describe, expect, it, vi } from "vitest";
import { ProcessMetricsService } from "@/shared/system/ProcessMetricsService";

const MB = 1024 * 1024;

const setup = () => {
  const histogram = {
    enable: vi.fn(),
    reset: vi.fn(),
    mean: 2_340_000,
    max: 412_000_000,
    percentile: vi.fn().mockReturnValue(25_160_000),
  };
  let now = 0n;
  const hrtime = Object.assign(vi.fn(), { bigint: vi.fn(() => now) });
  const proc = {
    cpuUsage: vi.fn().mockReturnValue({ user: 0, system: 0 }),
    memoryUsage: vi.fn().mockReturnValue({ heapUsed: 300.4 * MB, rss: 512 * MB }),
    hrtime,
  };
  const service = new ProcessMetricsService(histogram, proc as never);
  const advance = (ms: number) => {
    now += BigInt(ms) * 1_000_000n;
  };
  return { service, histogram, proc, advance };
};

describe("ProcessMetricsService", () => {
  it("start enables the event loop histogram", () => {
    const { service, histogram } = setup();

    service.start();

    expect(histogram.enable).toHaveBeenCalled();
  });

  it("reports CPU since the last snapshot, event loop delay in ms and memory in MB", () => {
    const { service, histogram, proc, advance } = setup();
    const last = { user: 1, system: 1 };
    proc.cpuUsage.mockReturnValueOnce(last);
    service.start();
    advance(60_000);
    proc.cpuUsage.mockReturnValueOnce({ user: 6_000_000, system: 1_200_000 });

    expect(service.getSnapshot()).toEqual({
      cpuPercent: 12,
      eventLoopDelayMs: { mean: 2.3, p99: 25.2, max: 412 },
      heapUsedMb: 300,
      rssMb: 512,
    });
    expect(proc.cpuUsage).toHaveBeenCalledWith(last);
    expect(histogram.percentile).toHaveBeenCalledWith(99);
  });

  it("resets the counters after a snapshot", () => {
    const { service, histogram, proc, advance } = setup();
    service.start();
    advance(60_000);
    const next = { user: 5, system: 5 };
    proc.cpuUsage.mockReturnValueOnce({ user: 0, system: 0 }).mockReturnValueOnce(next);
    service.getSnapshot();
    advance(30_000);
    proc.cpuUsage.mockReturnValueOnce({ user: 15_000_000, system: 0 });

    expect(service.getSnapshot().cpuPercent).toBe(50);
    expect(histogram.reset).toHaveBeenCalledTimes(2);
    expect(proc.cpuUsage).toHaveBeenNthCalledWith(5, next);
  });
});
