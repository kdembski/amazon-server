import { describe, expect, it, vi } from "vitest";
import { CountryRouter } from "@/routes/currency/CountryRouter";
import { CountryController } from "@/controllers/currency/CountryController";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../support/fakes";

describe("CountryRouter", () => {
  it("is mounted at /countries, registers GET / then CRUD routers", () => {
    const controller = {
      getAll: vi.fn(),
      creatable: {},
      updatable: {},
      deletable: {},
    };
    const { router, calls } = fakeRouter();
    const countryRouter = new CountryRouter(
      controller as unknown as CountryController,
      fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
      fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
      fakeSubRouter<DeletableRouter>("DELETABLE"),
      router
    );

    expect(countryRouter.path).toBe("/countries");
    expect(countryRouter.build().router).toBe(router);
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
