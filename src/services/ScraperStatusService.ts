import pm2 from "pm2";
import { ScraperStatusDto } from "@/dtos/ScraperStatusDtos";
import { calculateAvg } from "@/helpers/number";

export class ScraperStatusService {
  private static instance: ScraperStatusService;
  scrapers: pm2.ProcessDescription[] = [];
  statuses: Record<string, ScraperStatusDto & { speedDiff: number }> = {};
  cpuHistories: Record<string, number[]> = {};

  private constructor() {
    setInterval(() => this.updateScrapers(), 60 * 1000);
    setInterval(() => this.updateCpuUsage(), 1000);
  }

  public static getInstance(): ScraperStatusService {
    if (!ScraperStatusService.instance) {
      ScraperStatusService.instance = new ScraperStatusService();
    }

    return ScraperStatusService.instance;
  }

  setStatus(name: string, dto: ScraperStatusDto) {
    const speedDiff = dto.speed - (this.statuses[name]?.speed || 0);
    this.statuses[name] = { ...dto, speedDiff };
  }

  getCpuUsage(name: string) {
    return calculateAvg(this.cpuHistories[name]);
  }

  getScrapersCount() {
    return this.scrapers.length;
  }

  getScraperNames() {
    return this.scrapers
      .map((scraper) => scraper.name)
      .filter((name) => !!name) as string[];
  }

  private updateCpuUsage() {
    pm2.list((e, list) => {
      if (e) console.error(e);

      const names = this.getScraperNames();
      names.forEach((name) => {
        const usage = list.find((scraper) => scraper.name === name)?.monit?.cpu;
        if (!usage) return;

        if (!this.cpuHistories[name]) {
          this.cpuHistories[name] = [];
        }

        const length = this.cpuHistories[name].unshift(usage);
        this.cpuHistories[name].length = Math.min(length, 60 * 60);
      });
    });
  }

  private updateScrapers() {
    pm2.list((e, list) => {
      if (e) console.error(e);
      this.scrapers = list.filter((p) => p.name?.includes("pdp"));
    });
  }
}
