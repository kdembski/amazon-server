import { Request, Response } from "express";
import { DeletableServiceI } from "@/interfaces/crud/CRUDService";
import { DeletableControllerI } from "@/interfaces/crud/CRUDController";

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
      response.status(500).send(error?.message);
    }
  }
}
