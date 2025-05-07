import { ScraperStatusDto } from "@/dtos/ScraperStatusDtos";
import { ResponseErrorService } from "@/services/ResponseErrorService";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import { Request, Response } from "express";

export class ScrapersStatusController {
  service;

  constructor(service = ScrapersStatusService.getInstance()) {
    this.service = service;
  }

  async setStatus(
    request: Request<{}, {}, ScraperStatusDto>,
    response: Response
  ) {
    try {
      const data = request.body;
      this.service.setStatus(data);
      response.json(data);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
