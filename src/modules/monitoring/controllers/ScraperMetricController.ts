import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ScraperStatusService } from "@/modules/monitoring/services/ScraperStatusService";
import { ScraperMetricValidator } from "@/modules/monitoring/services/ScraperMetricValidator";
import { TimeRangeValidator } from "@/modules/monitoring/services/TimeRangeValidator";
import { IdempotencyCache } from "@/shared/http/IdempotencyCache";
import { respond } from "@/shared/http/respond";
import { Request, Response } from "express";

export class ScraperMetricController {
  service;
  private validator;
  private rangeValidator;
  private statusService;

  constructor(
    service = new ScraperMetricService(),
    validator = new ScraperMetricValidator(),
    rangeValidator = new TimeRangeValidator(),
    statusService = new ScraperStatusService()
  ) {
    this.statusService = statusService;
    this.service = service;
    this.validator = validator;
    this.rangeValidator = rangeValidator;
  }

  addMetrics(request: Request<{ name: string }, {}, unknown>, response: Response) {
    return respond(response, async () => {
      const name = this.validator.validateName(request.params.name);
      const dto = this.validator.validateMetrics(request.body);
      const stored = await this.service.add(name, dto, IdempotencyCache.getKey(request));
      return { stored };
    });
  }

  getSummaries(request: Request, response: Response) {
    return respond(response, () => {
      const { from, to } = this.rangeValidator.validate(request.query);
      return this.service.getSummaries(from, to);
    });
  }

  getSeries(request: Request, response: Response) {
    return respond(response, () => this.service.getSeries(this.rangeValidator.validate(request.query)));
  }

  getCountSeries(request: Request, response: Response) {
    return respond(response, () => this.service.getCountSeries(this.rangeValidator.validate(request.query)));
  }

  getBreakdown(request: Request, response: Response) {
    return respond(response, () => {
      const { from, to } = this.rangeValidator.validate(request.query);
      const by = this.validator.validateBreakdownKey(request.query.by);
      return this.service.getBreakdown(from, to, by);
    });
  }

  getStatuses(response: Response) {
    return respond(response, () => this.statusService.getStatuses());
  }
}
