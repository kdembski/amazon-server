import { describe, expect, it, vi } from "vitest";
import { ScraperStatusRouter } from "@/routes/ScraperStatusRouter";
import { ScraperStatusController } from "@/controllers/ScraperStatusController";
import { fakeRouter, routeTable } from "../../support/fakes";

describe("ScraperStatusRouter", () => {
  it("is mounted at /scrapers and registers the status route", () => {
    const controller = { setStatus: vi.fn() };
    const { router, calls } = fakeRouter();
    const statusRouter = new ScraperStatusRouter(
      controller as unknown as ScraperStatusController,
      router
    );

    expect(statusRouter.path).toBe("/scrapers");
    expect(statusRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([["post", "/:name/status"]]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.setStatus).toHaveBeenCalledWith("req", "res");
  });
});
