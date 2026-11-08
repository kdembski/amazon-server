import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { respond } from "@/shared/http/respond";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonAdCategoryService } from "@/modules/marketplaces/amazon/services/AmazonAdCategoryService";

export class AmazonAdCategoryController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new AmazonAdCategoryService(),
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

  getForScraping(response: Response) {
    return respond(response, () => this.service.getForScraping());
  }
}
