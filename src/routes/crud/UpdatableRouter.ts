import { UpdatableControllerI } from "@/interfaces/crud/CRUDController";
import { Router } from "express";

export class UpdatableRouter<UpdateInput> {
  private controller;
  private _router;

  constructor(
    controller: UpdatableControllerI<UpdateInput>,
    router = Router()
  ) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.put("/:id", (req, res) => this.controller.update(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
