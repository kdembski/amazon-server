import { Request, Response } from "express";
import { UpdatableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { UpdatableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

export class UpdatableController<UpdateInput, Model>
  implements UpdatableControllerI<UpdateInput>
{
  private service;

  constructor(service: UpdatableServiceI<UpdateInput, Model>) {
    this.service = service;
  }

  async update(
    request: Request<{ id: string }, {}, UpdateInput>,
    response: Response
  ) {
    try {
      const id = parseInt(request.params.id);
      const data = request.body;

      const results = await this.service.update(id, data);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
