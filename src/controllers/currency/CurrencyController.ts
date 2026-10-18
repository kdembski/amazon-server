import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { CurrencyService } from "@/services/currency/CurrencyService";

export class CurrencyController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new CurrencyService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
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
