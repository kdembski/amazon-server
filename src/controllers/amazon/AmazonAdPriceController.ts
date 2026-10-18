import { Request, Response } from "express";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonAdPriceCreateDto } from "@/dtos/amazon/AmazonAdPriceDtos";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { ResponseErrorService } from "@/shared/http/ResponseErrorService";

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
