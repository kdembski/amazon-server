import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { respond } from "@/shared/http/respond";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { CountryService } from "@/modules/currency/services/CountryService";

export class CountryController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new CountryService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }
}
