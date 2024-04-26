import { Request, Response } from "express";
import { CreatableServiceI } from "@/interfaces/crud/CRUDService";
import { CreatableControllerI } from "@/interfaces/crud/CRUDController";
import { ResponseErrorService } from "@/services/ResponseErrorService";

export class CreatableController<CreateDto, Model>
  implements CreatableControllerI<CreateDto>
{
  private service;

  constructor(service: CreatableServiceI<CreateDto, Model>) {
    this.service = service;
  }

  async create(request: Request<{}, {}, CreateDto>, response: Response) {
    try {
      const data = request.body;

      const results = await this.service.create(data);
      response.json(results);

      return results;
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
