import { Request, Response } from "express";
import { SettingUpdateDto } from "@/modules/settings/dtos/SettingDtos";
import { SettingService } from "@/modules/settings/services/SettingService";
import { respond } from "@/shared/http/respond";

export class SettingController {
  private service;

  constructor(service = new SettingService()) {
    this.service = service;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }

  set(request: Request<{ key: string }, {}, SettingUpdateDto>, response: Response) {
    return respond(response, () => this.service.set(request.params.key, request.body?.value));
  }
}
