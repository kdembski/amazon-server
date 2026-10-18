import { ScraperStatusController } from "@/modules/monitoring/controllers/ScraperStatusController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class ScraperStatusRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/scrapers";

  constructor(controller = new ScraperStatusController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.post("/:name/status", (req, res) =>
      this.controller.setStatus(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
