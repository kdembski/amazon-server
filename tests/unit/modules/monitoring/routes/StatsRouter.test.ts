import { describe, expect, it, vi } from "vitest";
import { StatsRouter } from "@/modules/monitoring/routes/StatsRouter";
import { StatsController } from "@/modules/monitoring/controllers/StatsController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("StatsRouter", () => {
  it("is mounted at /stats and registers the activity and logs routes", () => {
    const controller = { getActivity: vi.fn(), getLogs: vi.fn() };
    const { router, calls } = fakeRouter();
    const statsRouter = new StatsRouter(controller as unknown as StatsController, router);

    expect(statsRouter.path).toBe("/stats");
    expect(statsRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/activity"],
      ["get", "/logs"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.getActivity).toHaveBeenCalledWith("req", "res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.getLogs).toHaveBeenCalledWith("req", "res");
  });
});
