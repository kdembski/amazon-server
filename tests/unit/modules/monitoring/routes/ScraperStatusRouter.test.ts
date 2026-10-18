import { describe, expect, it, vi } from "vitest";
import { ScraperStatusRouter } from "@/modules/monitoring/routes/ScraperStatusRouter";
import { ScraperStatusController } from "@/modules/monitoring/controllers/ScraperStatusController";
import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("ScraperStatusRouter", () => {
  it("is mounted at /scrapers and registers the status and metrics routes", () => {
    const controller = { setStatus: vi.fn() };
    const metricController = { addMetrics: vi.fn() };
    const { router, calls } = fakeRouter();
    const statusRouter = new ScraperStatusRouter(
      controller as unknown as ScraperStatusController,
      metricController as unknown as ScraperMetricController,
      router
    );

    expect(statusRouter.path).toBe("/scrapers");
    expect(statusRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["post", "/:name/status"],
      ["post", "/:name/metrics"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.setStatus).toHaveBeenCalledWith("req", "res");

    (calls[1].handler as Function)("req", "res");
    expect(metricController.addMetrics).toHaveBeenCalledWith("req", "res");
  });
});
