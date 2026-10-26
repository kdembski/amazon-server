import { assertScraperName } from "@/modules/monitoring/helpers/assertScraperName";
import { parseScraperMetrics } from "@/modules/monitoring/helpers/parseScraperMetrics";
import { parseTimeRange } from "@/modules/monitoring/helpers/parseTimeRange";
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

  async getSummaries(request: Request, response: Response) {
    try {
      const { from, to } = parseTimeRange(request.query);
      response.json(await this.service.getSummaries(from, to));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async getSeries(request: Request, response: Response) {
    try {
      const range = parseTimeRange(request.query);
      response.json(await this.service.getSeries(range));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
