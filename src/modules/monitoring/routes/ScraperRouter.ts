import { ScraperConfigController } from "@/modules/monitoring/controllers/ScraperConfigController";
import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { SubRouterI } from "@/shared/http/interfaces/SubRouterI";
import { Router } from "express";

export class ScraperRouter implements SubRouterI {
  private metricController;
  private configController;
  private _router;
  readonly path = "/scrapers";

  constructor(
    metricController = new ScraperMetricController(),
    configController = new ScraperConfigController(),
    router = Router()
  ) {
    this.metricController = metricController;
    this.configController = configController;
    this._router = router;
  }

  build() {
    this.router.post("/:name/metrics", (req, res) =>
      this.metricController.addMetrics(req, res)
    );
    this.router.get("/:name/config", (req, res) =>
      this.configController.getConfig(req, res)
    );
    return this;
  }

  get router() {
    return this._router;
  }
}
