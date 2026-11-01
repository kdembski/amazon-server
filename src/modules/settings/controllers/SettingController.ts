import { Request, Response } from "express";
import { SettingUpdateDto } from "@/modules/settings/dtos/SettingDtos";
import { SettingService } from "@/modules/settings/services/SettingService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

export class SettingController {
  private service;

  constructor(service = new SettingService()) {
    this.service = service;
  }

  async getAll(response: Response) {
    try {
      response.json(await this.service.getAll());
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async set(
    request: Request<{ key: string }, {}, SettingUpdateDto>,
    response: Response
  ) {
    try {
      response.json(await this.service.set(request.params.key, request.body?.value));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async reset(request: Request<{ key: string }>, response: Response) {
    try {
      response.json(await this.service.reset(request.params.key));
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
