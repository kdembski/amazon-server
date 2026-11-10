import { describe, expect, it, vi } from "vitest";
import { AmazonCountryRouteRouter } from "@/modules/marketplaces/amazon/routes/AmazonCountryRouteRouter";
import { AmazonCountryRouteController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryRouteController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

const setup = () => {
  const controller = { getAll: vi.fn(), creatable: {}, updatable: {}, deletable: {} };
  const { router, calls } = fakeRouter();
  const routeRouter = new AmazonCountryRouteRouter(
    controller as unknown as AmazonCountryRouteController,
    fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
    fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
    fakeSubRouter<DeletableRouter>("DELETABLE"),
    router
  );
  return { controller, router, calls, routeRouter };
};

describe("AmazonCountryRouteRouter", () => {
  it("is mounted at /amazon/countries/routes", () => {
    expect(setup().routeRouter.path).toBe("/amazon/countries/routes");
  });

  it("registers GET / before CRUD routers and delegates to the controller", () => {
    const { calls, routeRouter, controller, router } = setup();

    expect(routeRouter.build().router).toBe(router);

    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
      ["use", "DELETABLE"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
  });
});
