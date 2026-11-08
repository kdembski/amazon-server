import { Request, Response } from "express";
import { SelectableServiceI } from "@/shared/crud/interfaces/CRUDService";
import { SelectableControllerI } from "@/shared/crud/interfaces/CRUDController";
import { respond } from "@/shared/http/respond";

export class SelectableController<SelectResult> implements SelectableControllerI {
  private service;

  constructor(service: SelectableServiceI<SelectResult>) {
    this.service = service;
  }

  getById(request: Request<{ id: string }>, response: Response) {
    return respond(response, () => this.service.getById(parseInt(request.params.id)));
  }
}
