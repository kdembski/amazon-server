import { OlxProductController } from "@/controllers/olx/OlxProductController";
import { SubRouterI } from "@/interfaces/SubRouterI";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { SelectableRouter } from "@/routes/crud/SelectableRouter";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { Router } from "express";

export class OlxProductRouter implements SubRouterI {
  private controller;
  private selectable;
  private creatable;
  private updatable;
  private deletable;
  private _router;
  readonly path = "/olx-products";

  constructor(
    controller = new OlxProductController(),
    selectable = new SelectableRouter(controller.selectable),
    creatable = new CreatableRouter(controller.creatable),
    updatable = new UpdatableRouter(controller.updatable),
    deletable = new DeletableRouter(controller.deletable),
    router = Router()
  ) {
    this.controller = controller;
    this.selectable = selectable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.use(this.selectable.build().router);
    this.router.use(this.creatable.build().router);
    this.router.use(this.updatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
