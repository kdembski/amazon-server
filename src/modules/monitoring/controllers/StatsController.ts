import { ActivityStatsService } from "@/modules/monitoring/services/ActivityStatsService";
import { LogStatsService } from "@/modules/monitoring/services/LogStatsService";
import { TimeRangeValidator } from "@/modules/monitoring/services/TimeRangeValidator";
import { respond } from "@/shared/http/respond";
import { Request, Response } from "express";

export class StatsController {
  private activityStatsService;
  private logStatsService;
  private rangeValidator;

  constructor(
    activityStatsService = new ActivityStatsService(),
    logStatsService = new LogStatsService(),
    rangeValidator = new TimeRangeValidator()
  ) {
    this.activityStatsService = activityStatsService;
    this.logStatsService = logStatsService;
    this.rangeValidator = rangeValidator;
  }

  getActivity(request: Request, response: Response) {
    return respond(response, () => this.activityStatsService.get(this.rangeValidator.validate(request.query)));
  }

  getLogs(request: Request, response: Response) {
    return respond(response, () => this.logStatsService.get(this.rangeValidator.validate(request.query)));
  }
}
