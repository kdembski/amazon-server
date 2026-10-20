import { AmazonExclusionRuleController } from "@/modules/marketplaces/amazon/controllers/AmazonExclusionRuleController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { Router } from "express";

export class AmazonExclusionRuleRouter implements SubRouterI {
  private controller;
  private creatable;
  private deletable;
  private updatable;
  private _router;
  readonly path = "/amazon/exclusion-rules";

  constructor(
    controller = new AmazonExclusionRuleController(),
    creatable = new CreatableRouter(controller.creatable),
    updatable = new UpdatableRouter(controller.updatable),
    deletable = new DeletableRouter(controller.deletable),
    router = Router()
  ) {
    this.controller = controller;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.post("/batch", (req, res) =>
      this.controller.applyBatch(req, res)
    );
    this.router.use(this.creatable.build().router);
    this.router.use(this.updatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
