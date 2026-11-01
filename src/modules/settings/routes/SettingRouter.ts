import { SettingController } from "@/modules/settings/controllers/SettingController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class SettingRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/settings";

  constructor(controller = new SettingController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.put("/:key", (req, res) => this.controller.set(req, res));
    this.router.delete("/:key", (req, res) => this.controller.reset(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
