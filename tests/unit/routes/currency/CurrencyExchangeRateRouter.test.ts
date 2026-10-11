import { describe, expect, it } from "vitest";
import { CurrencyExchangeRateRouter } from "@/routes/currency/CurrencyExchangeRateRouter";
import { CurrencyExchangeRateController } from "@/controllers/currency/CurrencyExchangeRateController";
import { CreatableRouter } from "@/routes/crud/CreatableRouter";
import { UpdatableRouter } from "@/routes/crud/UpdatableRouter";
import { DeletableRouter } from "@/routes/crud/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../support/fakes";

describe("CurrencyExchangeRateRouter", () => {
  it("is mounted at /currencies/rates and uses the three CRUD routers in order", () => {
    const { router, calls } = fakeRouter();
    const rateRouter = new CurrencyExchangeRateRouter(
      {
        creatable: {},
        updatable: {},
        deletable: {},
      } as unknown as CurrencyExchangeRateController,
      fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
      fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
      fakeSubRouter<DeletableRouter>("DELETABLE"),
      router
    );

    expect(rateRouter.path).toBe("/currencies/rates");
    expect(rateRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
      ["use", "DELETABLE"],
    ]);
  });
});
