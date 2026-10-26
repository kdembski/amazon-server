import { StatsController } from "@/modules/monitoring/controllers/StatsController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class StatsRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/stats";

  constructor(controller = new StatsController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/activity", (req, res) => this.controller.getActivity(req, res));
    this.router.get("/logs", (req, res) => this.controller.getLogs(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
