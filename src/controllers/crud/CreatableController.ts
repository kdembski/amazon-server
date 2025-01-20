import { Request, Response } from "express";
import { CreatableServiceI } from "@/interfaces/crud/CRUDService";
import { CreatableControllerI } from "@/interfaces/crud/CRUDController";
import { ResponseErrorService } from "@/services/ResponseErrorService";
import { isArray } from "lodash";

export class CreatableController<CreateDto, Model>
  implements CreatableControllerI<CreateDto>
{
  private service;

  constructor(service: CreatableServiceI<CreateDto, Model>) {
    this.service = service;
  }

  async create(
    request: Request<{}, {}, CreateDto | CreateDto[]>,
    response: Response
  ) {
    try {
      const data = request.body;

      if (isArray(data)) {
        const results = this.service.createMany(data);
        await Promise.all(results);
        response.json(results);
        return;
      }

      const results = await this.service.create(data);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
