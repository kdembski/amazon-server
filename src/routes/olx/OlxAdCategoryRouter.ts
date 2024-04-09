import { OlxAdCategoryController } from "@/controllers/olx/OlxAdCategoryController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { Router } from "express";

export class OlxAdCategoryRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/olx/ads/categories";

  constructor(controller = new OlxAdCategoryController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    return this;
  }

  get router() {
    return this._router;
  }
}
