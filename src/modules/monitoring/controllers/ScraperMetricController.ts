import { assertScraperName } from "@/modules/monitoring/helpers/assertScraperName";
import { parseScraperMetrics } from "@/modules/monitoring/helpers/parseScraperMetrics";
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
      const { name } = request.params;
      assertScraperName(name);
      const dto = parseScraperMetrics(request.body);
      const stored = await this.service.add(name, dto);
      response.json({ stored });
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
