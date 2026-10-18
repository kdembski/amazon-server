import { Request, Response } from "express";
import { DeletableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { DeletableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

export class DeletableController<Model> implements DeletableControllerI {
  private service;

  constructor(service: DeletableServiceI<Model>) {
    this.service = service;
  }

  async delete(request: Request<{ id: string }>, response: Response) {
    try {
      const id = parseInt(request.params.id);

      const results = await this.service.delete(id);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
