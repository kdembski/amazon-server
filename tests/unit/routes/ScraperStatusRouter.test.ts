import { describe, expect, it, vi } from "vitest";
import { ScraperStatusRouter } from "@/routes/ScraperStatusRouter";
import { ScraperStatusController } from "@/controllers/ScraperStatusController";
import { fakeRouter, routeTable } from "../../support/fakes";

describe("ScraperStatusRouter", () => {
  it("is mounted at /scrapers and registers count, cpu and status routes", () => {
    const controller = {
      getCount: vi.fn(),
      getCpuUsage: vi.fn(),
      setStatus: vi.fn(),
    };
    const { router, calls } = fakeRouter();
    const statusRouter = new ScraperStatusRouter(
      controller as unknown as ScraperStatusController,
      router
    );

    expect(statusRouter.path).toBe("/scrapers");
    expect(statusRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/count"],
      ["get", "/:name/cpu"],
      ["post", "/:name/status"],
    ]);

    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    (calls[2].handler as Function)("req", "res");
    expect(controller.getCount).toHaveBeenCalledWith("res");
    expect(controller.getCpuUsage).toHaveBeenCalledWith("req", "res");
    expect(controller.setStatus).toHaveBeenCalledWith("req", "res");
  });
});
