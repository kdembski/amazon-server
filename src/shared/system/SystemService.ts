import _ from "lodash";
import { OSUtils } from "node-os-utils";
import { SystemLogService } from "@/shared/logging/services/SystemLogService";

export class SystemService {
  private static instance: SystemService;
  private cpuUsageHistory: number[] = [];
  private cpuUsageFailing = false;

  private logger;
  private osUtils;

  private constructor(logger = SystemLogService.getInstance(), osUtils = new OSUtils()) {
    this.logger = logger;
    this.osUtils = osUtils;
    setInterval(() => this.updateCpuUsage(), 1000);
  }

  public static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }

    return SystemService.instance;
  }

  getCpuUsage() {
    return this.cpuUsageHistory.length ? _.mean(this.cpuUsageHistory) : 0;
  }

  // Runs every second: logs only the first failure of a series.
  async updateCpuUsage() {
    try {
      const result = await this.osUtils.cpu.usage();
      if (!result.success) throw result.error;
      const length = this.cpuUsageHistory.unshift(result.data);
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
    const result = await this.osUtils.memory.usage();
    if (!result.success) throw result.error;
    return Math.round(result.data);
  }

  async getDiskSpace() {
    const result = await this.osUtils.disk.usageByMountPoint("/");
    if (!result.success || !result.data) return undefined;
    const { used, total, usagePercentage } = result.data;

    return {
      used: used.toGB().toFixed(1),
      total: total.toGB().toFixed(1),
      percentage: usagePercentage.toFixed(1),
    };
  }
}
