import { ResponseErrorService } from "@/services/ResponseErrorService";
import { ScrapersStatusService } from "@/services/ScrapersStatusService";
import { Request, Response } from "express";

export class ScrapersStatusController {
  service;

  constructor(service = ScrapersStatusService.getInstance()) {
    this.service = service;
  }

  async setSpeed(
    request: Request<{}, {}, { name: string; speed: number }>,
    response: Response
  ) {
    try {
      const data = request.body;
      this.service.setSpeed(data.name, data.speed);
      response.json(data);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
