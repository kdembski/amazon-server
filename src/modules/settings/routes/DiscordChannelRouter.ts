import { DiscordChannelController } from "@/modules/settings/controllers/DiscordChannelController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class DiscordChannelRouter implements SubRouterI {
  private controller;
  private _router;
  readonly path = "/discord-channels";

  constructor(controller = new DiscordChannelController(), router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.post("/", (req, res) => this.controller.create(req, res));
    this.router.put("/:id", (req, res) => this.controller.update(req, res));
    this.router.delete("/:id", (req, res) => this.controller.delete(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
