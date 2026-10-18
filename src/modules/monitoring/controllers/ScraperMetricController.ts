import {
  InvalidScraperMetricsError,
  parseScraperMetrics,
} from "@/modules/monitoring/helpers/parseScraperMetrics";
import { ScraperMetricService } from "@/modules/monitoring/services/ScraperMetricService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { Request, Response } from "express";

export class ScraperMetricController {
  service;

  constructor(service = new ScraperMetricService()) {
    this.service = service;
  }

  async addMetrics(
    request: Request<{ name: string }, {}, unknown>,
    response: Response
  ) {
    try {
      const dto = parseScraperMetrics(request.body);
      const stored = await this.service.add(request.params.name, dto);
      response.json({ stored });
    } catch (error: any) {
      if (error instanceof InvalidScraperMetricsError) {
        response.status(400).send(error.message);
        return;
      }
      new ResponseErrorService(response).send(error);
    }
  }
}
