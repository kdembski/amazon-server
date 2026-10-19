import { describe, expect, it, vi } from "vitest";
import { AmazonSearchRuleRouter } from "@/modules/marketplaces/amazon/routes/AmazonSearchRuleRouter";
import { AmazonSearchRuleController } from "@/modules/marketplaces/amazon/controllers/AmazonSearchRuleController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

const setup = () => {
  const controller = {
    getAll: vi.fn(),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  const { router, calls } = fakeRouter();
  const searchRuleRouter = new AmazonSearchRuleRouter(
    controller as unknown as AmazonSearchRuleController,
    fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
    fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
    fakeSubRouter<DeletableRouter>("DELETABLE"),
    router
  );
  return { controller, router, calls, searchRuleRouter };
};

describe("AmazonSearchRuleRouter", () => {
  it("is mounted at /amazon/search-rules", () => {
    expect(setup().searchRuleRouter.path).toBe("/amazon/search-rules");
  });

  it("registers GET / before CRUD routers and delegates to the controller", () => {
    const { calls, searchRuleRouter, controller, router } = setup();

    expect(searchRuleRouter.build().router).toBe(router);

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
