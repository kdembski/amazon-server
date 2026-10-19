import { describe, expect, it, vi } from "vitest";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("ScraperRouter", () => {
  it("is mounted at /scrapers and registers the metrics route", () => {
    const metricController = { addMetrics: vi.fn() };
    const { router, calls } = fakeRouter();
    const scraperRouter = new ScraperRouter(
      metricController as unknown as ScraperMetricController,
      router
    );

    expect(scraperRouter.path).toBe("/scrapers");
    expect(scraperRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([["post", "/:name/metrics"]]);

    (calls[0].handler as Function)("req", "res");
    expect(metricController.addMetrics).toHaveBeenCalledWith("req", "res");
  });
});
