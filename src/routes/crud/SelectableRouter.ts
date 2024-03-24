import { SelectableControllerI } from "@/interfaces/crud/CRUDController";
import { Router } from "express";

export class SelectableRouter {
  private controller;
  private _router;

  constructor(controller: SelectableControllerI, router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.get("/:id", (req, res) => this.controller.getById(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
