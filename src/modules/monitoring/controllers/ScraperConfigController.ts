import { assertScraperName } from "@/modules/monitoring/helpers/assertScraperName";
import { ScraperConfigService } from "@/modules/monitoring/services/ScraperConfigService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { Request, Response } from "express";

export class ScraperConfigController {
  service;

  constructor(service = new ScraperConfigService()) {
    this.service = service;
  }

  async getConfig(request: Request<{ name: string }>, response: Response) {
    try {
      const { name } = request.params;
      assertScraperName(name);
      response.json(await this.service.get(name));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
