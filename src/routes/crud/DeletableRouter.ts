import { DeletableControllerI } from "@/interfaces/crud/CRUDController";
import { Router } from "express";

export class DeletableRouter {
  private controller;
  private _router;

  constructor(controller: DeletableControllerI, router = Router()) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.delete("/:id", (req, res) => this.controller.delete(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
