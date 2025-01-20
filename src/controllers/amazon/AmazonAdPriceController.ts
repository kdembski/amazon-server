import { Request, Response } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { ResponseErrorService } from "@/services/ResponseErrorService";

export class AmazonAdPriceController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new AmazonAdPriceService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }

  async createOrUpdate(
    request: Request<{}, {}, AmazonAdPriceCreateDto>,
    response: Response
  ) {
    try {
      const data = request.body;

      const results = await this.service.updateOrCreate(data);
      response.json(results);
    } catch (error: any) {
      new ResponseErrorService(response).send(error);
    }
  }
}
