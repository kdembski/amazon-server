import { CreatableControllerI } from "@/interfaces/crud/CRUDController";
import { Router } from "express";

export class CreatableRouter<CreateInput> {
  private controller;
  private _router;

  constructor(
    controller: CreatableControllerI<CreateInput>,
    router = Router()
  ) {
    this.controller = controller;
    this._router = router;
  }

  build() {
    this.router.post("/", (req, res) => this.controller.create(req, res));
    return this;
  }

  get router() {
    return this._router;
  }
}
