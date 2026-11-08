import { Request, Response } from "express";
import { UpdatableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { UpdatableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { respond } from "@/shared/http/respond";

export class UpdatableController<UpdateInput, Model> implements UpdatableControllerI<UpdateInput> {
  private service;

  constructor(service: UpdatableServiceI<UpdateInput, Model>) {
    this.service = service;
  }

  update(request: Request<{ id: string }, {}, UpdateInput>, response: Response) {
    return respond(response, () => this.service.update(parseInt(request.params.id), request.body));
  }
}
