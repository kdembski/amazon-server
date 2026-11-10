import { AmazonCountryRouteController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryRouteController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { Router } from "express";

export class AmazonCountryRouteRouter implements SubRouterI {
  private controller;
  private creatable;
  private updatable;
  private deletable;
  private _router;
  readonly path = "/amazon/countries/routes";

  constructor(
    controller = new AmazonCountryRouteController(),
    creatable = new CreatableRouter(controller.creatable),
    updatable = new UpdatableRouter(controller.updatable),
    deletable = new DeletableRouter(controller.deletable),
    router = Router()
  ) {
    this.controller = controller;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.use(this.creatable.build().router);
    this.router.use(this.updatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
