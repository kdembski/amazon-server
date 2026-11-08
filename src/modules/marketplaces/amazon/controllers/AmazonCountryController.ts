import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { respond } from "@/shared/http/respond";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonCountryService } from "@/modules/marketplaces/amazon/services/AmazonCountryService";

export class AmazonCountryController {
  private service;
  creatable;
  updatable;

  constructor(
    service = new AmazonCountryService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
  }

  getAll(response: Response) {
    return respond(response, () => this.service.getAll());
  }

  getForScraping(response: Response) {
    return respond(response, () => this.service.getForScraping());
  }
}
