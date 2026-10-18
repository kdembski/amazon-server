import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { ScraperStatusController } from "@/modules/monitoring/controllers/ScraperStatusController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class ScraperStatusRouter implements SubRouterI {
  private controller;
  private metricController;
  private _router;
  readonly path = "/scrapers";

  constructor(
    controller = new ScraperStatusController(),
    metricController = new ScraperMetricController(),
    router = Router()
  ) {
    this.controller = controller;
    this.metricController = metricController;
    this._router = router;
  }

  build() {
    this.router.post("/:name/status", (req, res) =>
      this.controller.setStatus(req, res)
    );
    this.router.post("/:name/metrics", (req, res) =>
      this.metricController.addMetrics(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
