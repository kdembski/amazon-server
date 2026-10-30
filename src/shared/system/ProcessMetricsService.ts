import { IntervalHistogram, monitorEventLoopDelay } from "node:perf_hooks";

const BYTES_PER_MB = 1024 * 1024;

type Histogram = Pick<IntervalHistogram, "enable" | "reset" | "mean" | "max" | "percentile">;
type Process = Pick<NodeJS.Process, "cpuUsage" | "memoryUsage" | "hrtime">;

const nsToMs = (ns: number) => Math.round(ns / 100_000) / 10;

export class ProcessMetricsService {
  private histogram;
  private process;
  private lastCpu;
  private lastAt;

  constructor(
    histogram: Histogram = monitorEventLoopDelay({ resolution: 20 }),
    process: Process = globalThis.process
  ) {
    this.histogram = histogram;
    this.process = process;
    this.lastCpu = process.cpuUsage();
    this.lastAt = process.hrtime.bigint();
  }

  start() {
    this.histogram.enable();
    this.lastCpu = this.process.cpuUsage();
    this.lastAt = this.process.hrtime.bigint();
  }

  // Covers the time since the previous snapshot (or start) and resets the counters
  getSnapshot() {
    const now = this.process.hrtime.bigint();
    const cpu = this.process.cpuUsage(this.lastCpu);
    const elapsedUs = Number(now - this.lastAt) / 1000;
    const { heapUsed, rss } = this.process.memoryUsage();
    const snapshot = {
      cpuPercent: Math.round(((cpu.user + cpu.system) * 100) / elapsedUs),
      eventLoopDelayMs: {
        mean: nsToMs(this.histogram.mean),
        p99: nsToMs(this.histogram.percentile(99)),
        max: nsToMs(this.histogram.max),
      },
      heapUsedMb: Math.round(heapUsed / BYTES_PER_MB),
      rssMb: Math.round(rss / BYTES_PER_MB),
    };

    this.histogram.reset();
    this.lastCpu = this.process.cpuUsage();
    this.lastAt = now;
    return snapshot;
  }
}
