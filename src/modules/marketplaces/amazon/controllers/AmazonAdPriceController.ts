import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { AmazonAdPriceService } from "@/modules/marketplaces/amazon/services/AmazonAdPriceService";

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
