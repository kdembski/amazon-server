import { describe, expect, it, vi } from "vitest";
import { AmazonAdCategoryRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdCategoryRouter";
import { AmazonAdCategoryController } from "@/modules/marketplaces/amazon/controllers/AmazonAdCategoryController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

const setup = () => {
  const controller = {
    getAll: vi.fn(),
    getForScraping: vi.fn(),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  const { router, calls } = fakeRouter();
  const categoryRouter = new AmazonAdCategoryRouter(
    controller as unknown as AmazonAdCategoryController,
    fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
    fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
    fakeSubRouter<DeletableRouter>("DELETABLE"),
    router
  );
  return { controller, router, calls, categoryRouter };
};

describe("AmazonAdCategoryRouter", () => {
  it("is mounted at /amazon/ads/categories", () => {
    expect(setup().categoryRouter.path).toBe("/amazon/ads/categories");
  });

  it("registers GET / and GET /scrap before CRUD routers and delegates to the controller", () => {
    const { calls, categoryRouter, controller, router } = setup();

    expect(categoryRouter.build().router).toBe(router);

    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["get", "/scrap"],
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
      ["use", "DELETABLE"],
    ]);

    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
    expect(controller.getForScraping).toHaveBeenCalledWith("res");
  });
});
