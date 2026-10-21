import { calculateAvg } from "@/shared/utils/number";
import osu from "node-os-utils";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class SystemService {
  private static instance: SystemService;
  private cpuUsageHistory: number[] = [];
  private cpuUsageFailing = false;

  private logger;

  private constructor(logger = SystemLogService.getInstance()) {
    this.logger = logger;
    setInterval(() => this.updateCpuUsage(), 1000);
  }

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }

    return SystemService.instance;
  }

  getCpuUsage() {
    return calculateAvg(this.cpuUsageHistory);
  }

  // Runs every second: logs only the first failure of a series.
  async updateCpuUsage() {
    try {
      const usage = await osu.cpu.usage();
      const length = this.cpuUsageHistory.unshift(usage);
      this.cpuUsageHistory.length = Math.min(length, 60 * 60);
      this.cpuUsageFailing = false;
    } catch (error) {
      if (!this.cpuUsageFailing) {
        this.logger.error("SystemService", "CPU usage could not be read", { error });
      }
      this.cpuUsageFailing = true;
    }
  }

  async getMemoryUsage() {
    const { totalMemMb, usedMemMb } = await osu.mem.used();
    return Math.round((usedMemMb * 100) / totalMemMb);
  }

  async getDiskSpace() {
    const disk = await osu.drive.info("/");

    return {
      used: disk.usedGb,
      total: disk.totalGb,
      percentage: disk.usedPercentage,
    };
  }
}
