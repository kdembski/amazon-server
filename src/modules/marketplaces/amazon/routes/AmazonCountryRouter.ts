import { AmazonCountryController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { Router } from "express";

export class AmazonCountryRouter implements SubRouterI {
  private controller;
  private creatable;
  private updatable;
  private _router;
  readonly path = "/amazon/countries";

  constructor(
    controller = new AmazonCountryController(),
    creatable = new CreatableRouter(controller.creatable),
    updatable = new UpdatableRouter(controller.updatable),
    router = Router()
  ) {
    this.controller = controller;
    this.creatable = creatable;
    this.updatable = updatable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.get("/scrap", (req, res) =>
      this.controller.getForScraping(res)
    );
    this.router.use(this.creatable.build().router);
    this.router.use(this.updatable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
