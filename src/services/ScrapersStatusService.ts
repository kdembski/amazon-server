import pm2 from "pm2";
import { ScraperStatusDto } from "@/dtos/ScraperStatusDtos";

export class ScrapersStatusService {
  private static instance: ScrapersStatusService;
  statuses: Record<string, ScraperStatusDto & { speedDiff: number }> = {};
  cpuHistory: Record<string, number[]> = {};

  private constructor() {
    setInterval(() => this.updateCpuUsage(), 1000);
  }

  public static getInstance(): ScrapersStatusService {
    if (!ScrapersStatusService.instance) {
      ScrapersStatusService.instance = new ScrapersStatusService();
    }

    return ScrapersStatusService.instance;
  }

  setStatus(dto: ScraperStatusDto) {
    const { name } = dto;
    const speedDiff = dto.speed - (this.statuses[name]?.speed || 0);

    this.statuses[name] = { ...dto, speedDiff };
  }

  updateCpuUsage() {
    pm2.list((e, list) => {
      if (e) console.error(e);

      const names = Object.keys(this.statuses);
      names.forEach((name) => {
        const usage = list.find((scraper) => scraper.name === name)?.monit?.cpu;
        if (!usage) return;

        if (!this.cpuHistory[name]) {
          this.cpuHistory[name] = [];
        }

        const length = this.cpuHistory[name].unshift(usage);
        this.cpuHistory[name].length = Math.min(length, 60 * 60);
      });
    });
  }
}
