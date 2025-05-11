import { SystemController } from "@/controllers/SystemController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { Router } from "express";

export class SystemRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/system";

  constructor(controller = new SystemController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/cpu", (req, res) => this.controller.getCpuUsage(res));
    return this;
  }

  get router() {
    return this._router;
  }
}
