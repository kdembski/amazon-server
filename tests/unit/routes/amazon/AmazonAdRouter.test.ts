import { describe, expect, it, vi } from "vitest";
import { AmazonAdRouter } from "@/routes/amazon/AmazonAdRouter";
import { AmazonAdController } from "@/controllers/amazon/AmazonAdController";
import { SelectableRouter } from "@/shared/crud/routes/SelectableRouter";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../support/fakes";

const setup = () => {
  const controller = {
    getAll: vi.fn(),
    getForScraping: vi.fn(),
    update: vi.fn(),
    selectable: {},
    creatable: {},
    deletable: {},
  };
  const { router, calls } = fakeRouter();
  const amazonAdRouter = new AmazonAdRouter(
    controller as unknown as AmazonAdController,
    fakeSubRouter<SelectableRouter>("SELECTABLE"),
    fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
    fakeSubRouter<DeletableRouter>("DELETABLE"),
    router
  );
  return { controller, router, calls, amazonAdRouter };
};

describe("AmazonAdRouter", () => {
  it("is mounted at /amazon/ads", () => {
    expect(setup().amazonAdRouter.path).toBe("/amazon/ads");
  });

  it("registers specific routes before the generic CRUD routers, /scrap before /:id", () => {
    const { calls, amazonAdRouter, router } = setup();

    expect(amazonAdRouter.build().router).toBe(router);

    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["get", "/scrap"],
      ["put", "/:id"],
      ["use", "SELECTABLE"],
      ["use", "CREATABLE"],
      ["use", "DELETABLE"],
    ]);
  });

  it("delegates handlers to the controller", () => {
    const { controller, calls, amazonAdRouter } = setup();
    amazonAdRouter.build();

    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    (calls[2].handler as Function)("req", "res");

    expect(controller.getAll).toHaveBeenCalledWith("res");
    expect(controller.getForScraping).toHaveBeenCalledWith("req", "res");
    expect(controller.update).toHaveBeenCalledWith("req", "res");
  });
});
