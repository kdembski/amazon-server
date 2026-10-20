import { Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";
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
