import { parseTimeRange } from "@/modules/monitoring/helpers/parseTimeRange";
import { ActivityStatsService } from "@/modules/monitoring/services/ActivityStatsService";
import { LogStatsService } from "@/modules/monitoring/services/LogStatsService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { Request, Response } from "express";

export class StatsController {
  private activityStatsService;
  private logStatsService;

  constructor(
    activityStatsService = new ActivityStatsService(),
    logStatsService = new LogStatsService()
  ) {
    this.activityStatsService = activityStatsService;
    this.logStatsService = logStatsService;
  }

  async getActivity(request: Request, response: Response) {
    try {
      const range = parseTimeRange(request.query);
      response.json(await this.activityStatsService.get(range));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async getLogs(request: Request, response: Response) {
    try {
      const range = parseTimeRange(request.query);
      response.json(await this.logStatsService.get(range));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
