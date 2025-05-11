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

  async getCpuUsage(request: Request<{ name: string }>, response: Response) {
    try {
      const name = request.params.name;
      const usage = this.service.getCpuUsage(name);
      response.json(usage);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async getScrapersCount(response: Response) {
    try {
      const count = this.service.getScrapersCount();
      response.json(count);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
