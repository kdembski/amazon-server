import osu from "node-os-utils";

export class SystemService {
  private static instance: SystemService;
  private cpuUsageHistory: number[] = [];

  private constructor() {
    setInterval(async () => {
      const usage = await osu.cpu.usage();
      const length = this.cpuUsageHistory.unshift(usage);
      this.cpuUsageHistory.length = Math.min(length, 60 * 60);
    }, 1000);
  }

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }

    return SystemService.instance;
  }

  async getCpuUsage() {
    return Math.round(
      this.cpuUsageHistory.reduce((sum, v) => sum + v, 0) /
        this.cpuUsageHistory.length
    );
  }

  async getMemoryUsage() {
    const { totalMemMb, usedMemMb } = await osu.mem.used();
    return Math.round((usedMemMb * 100) / totalMemMb);
  }

  async getDiskSpace() {
    return new Promise<
      { used: string; total: string; percentage: string } | undefined
    >((resolve) => {
      osu.drive
        .info("/")
        .then((disk) => {
          resolve({
            used: disk.usedGb,
            total: disk.totalGb,
            percentage: disk.usedPercentage,
          });
        })
        .catch(() => {
          resolve(undefined);
        });
    });
  }
}
