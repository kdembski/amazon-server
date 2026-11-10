import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { respond } from "@/shared/http/respond";
import { AmazonCountryRouteService } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteService";

export class AmazonCountryRouteController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new AmazonCountryRouteService(),
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
