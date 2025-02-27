import { ScrapersStatusController } from "@/controllers/ScrapersStatusController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { Router } from "express";

export class ScrapersStatusRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/scrapers";

  constructor(controller = new ScrapersStatusController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.post("/speed", (req, res) =>
      this.controller.setSpeed(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
