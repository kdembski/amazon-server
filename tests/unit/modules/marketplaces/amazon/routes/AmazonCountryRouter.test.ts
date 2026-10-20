import { describe, expect, it, vi } from "vitest";
import { AmazonCountryRouter } from "@/modules/marketplaces/amazon/routes/AmazonCountryRouter";
import { AmazonCountryController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../../support/fakes";

describe("AmazonCountryRouter", () => {
  it("is mounted at /amazon/countries, registers GET / and GET /scrap then CRUD routers", () => {
    const controller = {
      getAll: vi.fn(),
      getForScraping: vi.fn(),
      creatable: {},
      updatable: {},
    };
    const { router, calls } = fakeRouter();
    const amazonCountryRouter = new AmazonCountryRouter(
      controller as unknown as AmazonCountryController,
      fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
      fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
      router
    );

    expect(amazonCountryRouter.path).toBe("/amazon/countries");
    expect(amazonCountryRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["get", "/"],
      ["get", "/scrap"],
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
    ]);
    (calls[0].handler as Function)("req", "res");
    (calls[1].handler as Function)("req", "res");
    expect(controller.getAll).toHaveBeenCalledWith("res");
    expect(controller.getForScraping).toHaveBeenCalledWith("res");
  });
});
