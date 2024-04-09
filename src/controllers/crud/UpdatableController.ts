import { Request, Response } from "express";
import { UpdatableServiceI } from "@/interfaces/crud/CRUDService";
import { UpdatableControllerI } from "@/interfaces/crud/CRUDController";

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
      response.status(500).send(error?.message);
    }
  }
}
