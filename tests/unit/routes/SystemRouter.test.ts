import { describe, expect, it, vi } from "vitest";
import { SystemRouter } from "@/routes/SystemRouter";
import { SystemController } from "@/controllers/SystemController";
import { fakeRouter, routeTable } from "../../support/fakes";

describe("SystemRouter", () => {
  it("is mounted at /system and registers cpu and mem routes", () => {
    const controller = { getCpuUsage: vi.fn(), getMemoryUsage: vi.fn() };
    const { router, calls } = fakeRouter();
    const systemRouter = new SystemRouter(
      controller as unknown as SystemController,
      router
    );

    expect(systemRouter.path).toBe("/system");
    expect(systemRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/cpu"],
      ["get", "/mem"],
    ]);

    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.getCpuUsage).toHaveBeenCalledWith("res");
    expect(controller.getMemoryUsage).toHaveBeenCalledWith("res");
  });
});
