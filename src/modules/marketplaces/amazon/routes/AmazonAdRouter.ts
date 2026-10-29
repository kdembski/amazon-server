import { Router, Request } from "express";
import { AmazonAdController } from "@/modules/marketplaces/amazon/controllers/AmazonAdController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { SelectableRouter } from "@/shared/crud/routes/SelectableRouter";

export class AmazonAdRouter implements SubRouterI {
  private controller;
  private selectable;
  private creatable;
  private deletable;
  private _router;
  readonly path = "/amazon/ads";

  constructor(
    controller = new AmazonAdController(),
    selectable = new SelectableRouter(controller.selectable),
    creatable = new CreatableRouter(controller.creatable),
    deletable = new DeletableRouter(controller.deletable),
    router = Router()
  ) {
    this.controller = controller;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
    this._router = router;
  }

  build() {
    this.router.get("/", (req, res) => this.controller.getAll(res));
    this.router.get(
      "/scrap",
      (req: Request<{}, {}, {}, { batchSize: string }>, res) =>
        this.controller.getForScraping(req, res)
    );
    this.router.post("/batch", (req, res) => this.controller.applyBatch(req, res));
    this.router.put("/:id", (req, res) => this.controller.update(req, res));
    this.router.use(this.selectable.build().router);
    this.router.use(this.creatable.build().router);
    this.router.use(this.deletable.build().router);

    return this;
  }

  get router() {
    return this._router;
  }
}
