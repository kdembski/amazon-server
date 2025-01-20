import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";

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
}
