import { ScraperStatusDto } from "@/dtos/ScraperStatusDtos";

export class ScraperStatusService {
  private static instance: ScraperStatusService;
  statuses: Record<string, ScraperStatusDto & { speedDiff: number }> = {};

  private constructor() {}

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
}
