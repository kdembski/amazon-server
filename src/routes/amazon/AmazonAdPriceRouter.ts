import { AmazonAdPriceController } from "@/controllers/amazon/AmazonAdPriceController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { Router } from "express";

export class AmazonAdPriceRouter implements SubRouterI {
  private creatable;
  private deletable;
  private updatable;
  private _router;
  readonly path = "/amazon/ads/prices";

  constructor(
    controller = new AmazonAdPriceController(),
    creatable = new CreatableRouter(controller.creatable),
    updatable = new UpdatableRouter(controller.updatable),
    deletable = new DeletableRouter(controller.deletable),
    router = Router()
  ) {
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.use(this.creatable.build().router);
    this.router.use(this.updatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
