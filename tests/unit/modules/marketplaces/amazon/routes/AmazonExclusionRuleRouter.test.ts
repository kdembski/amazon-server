import { describe, expect, it, vi } from "vitest";
import { AmazonExclusionRuleRouter } from "@/modules/marketplaces/amazon/routes/AmazonExclusionRuleRouter";
import { AmazonExclusionRuleController } from "@/modules/marketplaces/amazon/controllers/AmazonExclusionRuleController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

const setup = () => {
  const controller = {
    getAll: vi.fn(),
    applyBatch: vi.fn(),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  const { router, calls } = fakeRouter();
  const exclusionRuleRouter = new AmazonExclusionRuleRouter(
    controller as unknown as AmazonExclusionRuleController,
    fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
    fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
    fakeSubRouter<DeletableRouter>("DELETABLE"),
    router
  );
  return { controller, router, calls, exclusionRuleRouter };
};

describe("AmazonExclusionRuleRouter", () => {
  it("is mounted at /amazon/exclusion-rules", () => {
    expect(setup().exclusionRuleRouter.path).toBe("/amazon/exclusion-rules");
  });

  it("registers GET / and POST /batch before CRUD routers and delegates to the controller", () => {
    const { calls, exclusionRuleRouter, controller, router } = setup();

    expect(exclusionRuleRouter.build().router).toBe(router);

    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["post", "/batch"],
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
      ["use", "DELETABLE"],
    ]);

    (calls[0].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.applyBatch).toHaveBeenCalledWith("req", "res");
  });
});
