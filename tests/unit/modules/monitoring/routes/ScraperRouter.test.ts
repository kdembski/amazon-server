import { describe, expect, it, vi } from "vitest";
import { ScraperRouter } from "@/modules/monitoring/routes/ScraperRouter";
import { ScraperMetricController } from "@/modules/monitoring/controllers/ScraperMetricController";
import { ScraperConfigController } from "@/modules/monitoring/controllers/ScraperConfigController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("ScraperRouter", () => {
  it("is mounted at /scrapers and registers the summaries, series, metrics and config routes", () => {
    const metricController = { addMetrics: vi.fn(), getSummaries: vi.fn(), getSeries: vi.fn() };
    const configController = { getConfig: vi.fn() };
    const { router, calls } = fakeRouter();
    const scraperRouter = new ScraperRouter(
      metricController as unknown as ScraperMetricController,
      configController as unknown as ScraperConfigController,
      router
    );

    expect(scraperRouter.path).toBe("/scrapers");
    expect(scraperRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/summaries"],
      ["get", "/series"],
      ["post", "/:name/metrics"],
      ["get", "/:name/config"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(metricController.getSummaries).toHaveBeenCalledWith("req", "res");
    (calls[1].handler as Function)("req", "res");
    expect(metricController.getSeries).toHaveBeenCalledWith("req", "res");
    (calls[2].handler as Function)("req", "res");
    expect(metricController.addMetrics).toHaveBeenCalledWith("req", "res");
    (calls[3].handler as Function)("req", "res");
    expect(configController.getConfig).toHaveBeenCalledWith("req", "res");
  });
});
