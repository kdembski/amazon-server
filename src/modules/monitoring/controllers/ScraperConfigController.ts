import { ScraperConfigService } from "@/modules/monitoring/services/ScraperConfigService";
import { ScraperMetricValidator } from "@/modules/monitoring/services/ScraperMetricValidator";
import { respond } from "@/shared/http/respond";
import { Request, Response } from "express";

export class ScraperConfigController {
  service;
  private validator;

  constructor(service = new ScraperConfigService(), validator = new ScraperMetricValidator()) {
    this.service = service;
    this.validator = validator;
  }

  getConfig(request: Request<{ name: string }>, response: Response) {
    return respond(response, () => this.service.get(this.validator.validateName(request.params.name)));
  }
}
