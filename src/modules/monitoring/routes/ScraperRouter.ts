import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class ScraperRouter implements SubRouterI {
  private metricController;
  private _router;
  readonly path = "/scrapers";

  constructor(
    metricController = new ScraperMetricController(),
    router = Router()
  ) {
    this.metricController = metricController;
    this._router = router;
  }

  build() {
    this.router.post("/:name/metrics", (req, res) =>
      this.metricController.addMetrics(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
