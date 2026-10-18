import { ScraperStatusDto } from "@/modules/monitoring/dtos/ScraperStatusDtos";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { ScraperStatusService } from "@/modules/monitoring/services/ScraperStatusService";
import { Request, Response } from "express";

export class ScraperStatusController {
  service;

  constructor(service = ScraperStatusService.getInstance()) {
    this.service = service;
  }

  async setStatus(
    request: Request<{ name: string }, {}, ScraperStatusDto>,
    response: Response
  ) {
    try {
      const name = request.params.name;
      const data = request.body;
      this.service.setStatus(name, data);
      response.json(data);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
