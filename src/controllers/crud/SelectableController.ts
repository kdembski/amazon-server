import { Request, Response } from "express";
import { SelectableServiceI } from "@/interfaces/crud/CRUDService";
import { SelectableControllerI } from "@/interfaces/crud/CRUDController";

export class SelectableController<SelectResult>
  implements SelectableControllerI
{
  private service;

  constructor(service: SelectableServiceI<SelectResult>) {
    this.service = service;
  }

  async getById(request: Request<{ id: string }>, response: Response) {
    try {
      const id = parseInt(request.params.id);

      const item = await this.service.getById(id);
      response.json(item);
    } catch (error: any) {
      response.status(500).send(error?.message);
    }
  }
}
