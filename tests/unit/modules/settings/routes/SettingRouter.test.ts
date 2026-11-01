import { describe, expect, it, vi } from "vitest";
import { SettingRouter } from "@/modules/settings/routes/SettingRouter";
import { SettingController } from "@/modules/settings/controllers/SettingController";
import { fakeRouter, routeTable } from "../../../../support/fakes";

describe("SettingRouter", () => {
  it("is mounted at /settings and registers the list, set and reset routes", () => {
    const controller = { getAll: vi.fn(), set: vi.fn(), reset: vi.fn() };
    const { router, calls } = fakeRouter();
    const settingRouter = new SettingRouter(controller as unknown as SettingController, router);

    expect(settingRouter.path).toBe("/settings");
    expect(settingRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["put", "/:key"],
      ["delete", "/:key"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.set).toHaveBeenCalledWith("req", "res");
    (calls[2].handler as Function)("req", "res");
    expect(controller.reset).toHaveBeenCalledWith("req", "res");
  });
});
