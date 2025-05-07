import { ScraperStatusDto } from "@/dtos/ScraperStatusDtos";

export class ScrapersStatusService {
  private static instance: ScrapersStatusService;
  statuses: Record<string, ScraperStatusDto & { speedDiff: number }> = {};

  private constructor() {}

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
}
