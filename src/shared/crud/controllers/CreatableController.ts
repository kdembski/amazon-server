import { Request, Response } from "express";
import { CreatableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { CreatableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { respond } from "@/shared/http/respond";
import _ from "lodash";

export class CreatableController<CreateDto, Model> implements CreatableControllerI<CreateDto> {
  private service;

  constructor(service: CreatableServiceI<CreateDto, Model>) {
    this.service = service;
  }

  create(request: Request<{}, {}, CreateDto | CreateDto[]>, response: Response) {
    return respond(response, () => {
      const data = request.body;
      return _.isArray(data) ? this.service.createMany(data) : this.service.create(data);
    });
  }
}
