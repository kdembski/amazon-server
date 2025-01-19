import { Response, Request } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { ResponseErrorService } from "@/services/ResponseErrorService";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";

export class AmazonAdController {
  private service;
  creatable;
  selectable;
  deletable;

  constructor(
    service = new AmazonAdService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service.creatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
  }

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
