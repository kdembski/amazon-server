import { Request, Response } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { OlxAdService } from "@/services/olx/OlxAdService";

export class OlxAdController {
  private service;
  selectable;
  creatable;
  deletable;

  constructor(
    service = new OlxAdService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service),
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
    } catch (error) {
      response.json(error);
    }
  }
}
