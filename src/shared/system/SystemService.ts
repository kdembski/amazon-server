import { calculateAvg, roundToOneDecimal } from "@/shared/utils/number";
import osu from "node-os-utils";

export class SystemService {
  private static instance: SystemService;
  private cpuUsageHistory: number[] = [];

  private constructor() {
    setInterval(async () => {
      this.updateCpuUsage();
      console.log(`global: ${roundToOneDecimal(this.getCpuUsage())}%`);
    }, 1000);
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

  async updateCpuUsage() {
    const usage = await osu.cpu.usage();
    const length = this.cpuUsageHistory.unshift(usage);
    this.cpuUsageHistory.length = Math.min(length, 60 * 60);
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
