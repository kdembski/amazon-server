import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SystemService } from "@/shared/system/SystemService";
import { resetSingleton } from "../../../support/fakes";

const { cpuUsage, memUsed, driveInfo } = vi.hoisted(() => ({
  cpuUsage: vi.fn(),
  memUsed: vi.fn(),
  driveInfo: vi.fn(),
}));

vi.mock("node-os-utils", () => ({
  default: {
    cpu: { usage: cpuUsage },
    mem: { used: memUsed },
    drive: { info: driveInfo },
  },
}));

describe("SystemService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetSingleton(SystemService);
    cpuUsage.mockResolvedValue(10);
    memUsed.mockResolvedValue({ totalMemMb: 2000, usedMemMb: 500 });
    driveInfo.mockResolvedValue({
      usedGb: "10.0",
      totalGb: "100.0",
      usedPercentage: "10.0",
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("is a singleton", () => {
    expect(SystemService.getInstance()).toBe(SystemService.getInstance());
  });

  it("averages cpu samples", async () => {
    const service = SystemService.getInstance();

    await service.updateCpuUsage();
    cpuUsage.mockResolvedValue(30);
    await service.updateCpuUsage();

    expect(service.getCpuUsage()).toBe(20);
  });

  it("samples cpu every second", async () => {
    const service = SystemService.getInstance();

    await vi.advanceTimersByTimeAsync(1000);

    expect(cpuUsage).toHaveBeenCalledTimes(1);
    expect(service.getCpuUsage()).toBe(10);
  });

  it("returns memory usage as a rounded percentage", async () => {
    await expect(SystemService.getInstance().getMemoryUsage()).resolves.toBe(
      25
    );
  });

  it("maps disk info", async () => {
    await expect(SystemService.getInstance().getDiskSpace()).resolves.toEqual({
      used: "10.0",
      total: "100.0",
      percentage: "10.0",
    });
    expect(driveInfo).toHaveBeenCalledWith("/");
  });
});
