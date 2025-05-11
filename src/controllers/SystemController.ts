import { roundToOneDecimal } from "@/helpers/number";
import { ResponseErrorService } from "@/services/ResponseErrorService";
import { SystemService } from "@/services/SystemService";
import { Response } from "express";

export class SystemController {
  service;

  constructor(service = SystemService.getInstance()) {
    this.service = service;
  }

  async getCpuUsage(response: Response) {
    try {
      const usage = this.service.getCpuUsage();
      response.json(roundToOneDecimal(usage));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
