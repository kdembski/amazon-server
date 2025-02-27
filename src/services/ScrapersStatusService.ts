export class ScrapersStatusService {
  private static instance: ScrapersStatusService;
  speeds: Record<string, number> = {};

  private constructor() {}

  public static getInstance(): ScrapersStatusService {
    if (!ScrapersStatusService.instance) {
      ScrapersStatusService.instance = new ScrapersStatusService();
    }

    return ScrapersStatusService.instance;
  }

  setSpeed(name: string, value: number) {
    this.speeds[name] = value;
  }
}
