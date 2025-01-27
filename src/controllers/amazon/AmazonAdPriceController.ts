import { Request, Response } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { ResponseErrorService } from "@/services/ResponseErrorService";

export class AmazonAdPriceController {
  creatable;
  updatable;
  deletable;

  constructor(
    service = new AmazonAdPriceService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }
}
