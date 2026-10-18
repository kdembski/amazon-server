import { describe, expect, it, vi } from "vitest";
import { CurrencyRouter } from "@/routes/currency/CurrencyRouter";
import { CurrencyController } from "@/controllers/currency/CurrencyController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../support/fakes";

describe("CurrencyRouter", () => {
  it("is mounted at /currencies, registers GET / then CRUD routers", () => {
    const controller = {
      getAll: vi.fn(),
      creatable: {},
      updatable: {},
      deletable: {},
    };
    const { router, calls } = fakeRouter();
    const currencyRouter = new CurrencyRouter(
      controller as unknown as CurrencyController,
      fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
      fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
      fakeSubRouter<DeletableRouter>("DELETABLE"),
      router
    );

    expect(currencyRouter.path).toBe("/currencies");
    expect(currencyRouter.build().router).toBe(router);
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
