import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScraperStatusService } from "@/services/ScraperStatusService";
import { resetSingleton } from "../../support/fakes";

const { pm2List } = vi.hoisted(() => ({ pm2List: vi.fn() }));

vi.mock("pm2", () => ({ default: { list: pm2List } }));

type Proc = { name?: string; monit?: { cpu?: number } };

const givenProcesses = (processes: Proc[]) => {
  pm2List.mockImplementation((cb: (e: Error | null, list: Proc[]) => void) =>
    cb(null, processes)
  );
};

// Real pm2 passes only the error to the callback, no list.
const givenPm2Error = (error: Error) => {
  pm2List.mockImplementation((cb: (e: Error, list?: Proc[]) => void) =>
    cb(error)
  );
};

describe("ScraperStatusService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSingleton(ScraperStatusService);
    givenProcesses([]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is a singleton", () => {
    expect(ScraperStatusService.getInstance()).toBe(
      ScraperStatusService.getInstance()
    );
  });

  it("setStatus stores the dto with the speed difference to the previous status", () => {
    const service = ScraperStatusService.getInstance();

    service.setStatus("pdp-1", { speed: 1.5, pending: 10 });
    expect(service.statuses["pdp-1"]).toEqual({
      speed: 1.5,
      pending: 10,
      speedDiff: 1.5,
    });

    service.setStatus("pdp-1", { speed: 1.2, pending: 8 });
    expect(service.statuses["pdp-1"].speedDiff).toBeCloseTo(-0.3);
  });

  it("refreshes the scraper list every minute keeping only pdp processes", () => {
    const service = ScraperStatusService.getInstance();
    givenProcesses([{ name: "pdp-1" }, { name: "api" }, { name: "pdp-2" }, {}]);

    vi.advanceTimersByTime(60_000);

    expect(service.getNames()).toEqual(["pdp-1", "pdp-2"]);
    expect(service.getCount()).toBe(2);
  });

  it("samples cpu every second for known scrapers and averages it", () => {
    const service = ScraperStatusService.getInstance();
    // No monit during the first minute, so the scraper list gets populated
    // without taking a sample (independent of interval tie-break order).
    givenProcesses([{ name: "pdp-1" }, { name: "pdp-2" }]);
    vi.advanceTimersByTime(60_000);

    givenProcesses([{ name: "pdp-1", monit: { cpu: 10 } }, { name: "pdp-2" }]);
    vi.advanceTimersByTime(1000);
    givenProcesses([{ name: "pdp-1", monit: { cpu: 30 } }, { name: "pdp-2" }]);
    vi.advanceTimersByTime(1000);

    expect(service.getCpuUsage("pdp-1")).toBe(20);
    expect(service.getCpuUsage("pdp-2")).toBe(0);
  });

  it("keeps at most one hour of cpu samples", () => {
    const service = ScraperStatusService.getInstance();
    givenProcesses([{ name: "pdp-1", monit: { cpu: 5 } }]);

    vi.advanceTimersByTime(60_000 + 3700 * 1000);

    expect(service.cpuHistories["pdp-1"]).toHaveLength(3600);
  });

  it("logs pm2 errors from both pollers and keeps the previous state", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = ScraperStatusService.getInstance();
    givenProcesses([{ name: "pdp-1", monit: { cpu: 10 } }]);
    vi.advanceTimersByTime(61_000);
    expect(service.getNames()).toEqual(["pdp-1"]);

    const pm2Error = new Error("pm2 down");
    givenPm2Error(pm2Error);
    expect(() => vi.advanceTimersByTime(60_000)).not.toThrow();

    expect(error).toHaveBeenCalledWith(pm2Error);
    expect(error.mock.calls.length).toBeGreaterThanOrEqual(61);
    expect(service.getNames()).toEqual(["pdp-1"]);
    expect(service.getCpuUsage("pdp-1")).toBe(10);
  });
});
