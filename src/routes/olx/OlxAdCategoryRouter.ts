import { OlxAdCategoryController } from "@/controllers/olx/OlxAdCategoryController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { Router } from "express";

export class OlxAdCategoryRouter implements SubRouterI {
  private controller;
  private creatable;
  private deletable;
  private _router;
  readonly path = "/olx/ads/categories";

  constructor(
    controller = new OlxAdCategoryController(),
    creatable = new CreatableRouter(controller),
    deletable = new DeletableRouter(controller),
    router = Router()
  ) {
    this.controller = controller;
    this.creatable = creatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.use(this.creatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
