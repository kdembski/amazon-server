import { describe, expect, it, vi } from "vitest";
import { AmazonAdRouter } from "@/modules/marketplaces/amazon/routes/AmazonAdRouter";
import { AmazonAdController } from "@/modules/marketplaces/amazon/controllers/AmazonAdController";
import { SelectableRouter } from "@/shared/crud/routes/SelectableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

const setup = () => {
  const controller = {
    getAll: vi.fn(),
    getForScraping: vi.fn(),
    update: vi.fn(),
    applyBatch: vi.fn(),
    create: vi.fn(),
    selectable: {},
    creatable: {},
    deletable: {},
  };
  const { router, calls } = fakeRouter();
  const amazonAdRouter = new AmazonAdRouter(
    controller as unknown as AmazonAdController,
    fakeSubRouter<SelectableRouter>("SELECTABLE"),
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
      ["post", "/batch"],
      ["put", "/:id"],
      ["post", "/"],
      ["use", "SELECTABLE"],
      ["use", "DELETABLE"],
    ]);
  });

  it("delegates handlers to the controller", () => {
    const { controller, calls, amazonAdRouter } = setup();
    amazonAdRouter.build();

    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    (calls[2].handler as Function)("req", "res");
    (calls[3].handler as Function)("req", "res");
    (calls[4].handler as Function)("req", "res");

    expect(controller.getAll).toHaveBeenCalledWith("res");
    expect(controller.getForScraping).toHaveBeenCalledWith("req", "res");
    expect(controller.applyBatch).toHaveBeenCalledWith("req", "res");
    expect(controller.update).toHaveBeenCalledWith("req", "res");
    expect(controller.create).toHaveBeenCalledWith("req", "res");
  });
});
