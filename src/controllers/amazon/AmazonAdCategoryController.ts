import { Response, Request } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonAdCategoryService } from "@/services/amazon/AmazonAdCategoryService";

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

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }

  async getForScraping(response: Response) {
    try {
      const results = await this.service.getForScraping();
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
