import { Request, Response } from "express";
import { DeletableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { DeletableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { respond } from "@/shared/http/respond";

export class DeletableController<Model> implements DeletableControllerI {
  private service;

  constructor(service: DeletableServiceI<Model>) {
    this.service = service;
  }

  delete(request: Request<{ id: string }>, response: Response) {
    return respond(response, () => this.service.delete(parseInt(request.params.id)));
  }
}
