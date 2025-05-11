import { ScraperStatusController } from "@/controllers/ScraperStatusController";
import { SubRouterI } from "@/interfaces/SubRouterI";
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
    this.router.get("/count", (_, res) =>
      this.controller.getScrapersCount(res)
    );
    this.router.get("/:name/cpu", (req, res) =>
      this.controller.getCpuUsage(req, res)
    );
    this.router.post("/:name/status", (req, res) =>
      this.controller.setStatus(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
