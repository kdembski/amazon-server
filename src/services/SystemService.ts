import { calculateAvg, roundToOneDecimal } from "@/helpers/number";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import osu from "node-os-utils";

export class SystemService {
  private static instance: SystemService;
  private scrapersService;
  private cpuUsageHistory: number[] = [];

  private constructor(scrapersService = ScrapersStatusService.getInstance()) {
    this.scrapersService = scrapersService;

    setInterval(async () => {
      this.updateCpuUsage();

      const logs = [
        ...Object.entries(this.scrapersService.cpuHistory).map(
          ([name, history]) =>
            `${name}: ${roundToOneDecimal(calculateAvg(history))}%`
        ),
        `global: ${roundToOneDecimal(this.getCpuUsage())}%`,
      ];
      console.log(logs);
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
