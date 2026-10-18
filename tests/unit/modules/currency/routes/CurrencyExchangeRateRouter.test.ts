import { describe, expect, it } from "vitest";
import { CurrencyExchangeRateRouter } from "@/modules/currency/routes/CurrencyExchangeRateRouter";
import { CurrencyExchangeRateController } from "@/modules/currency/controllers/CurrencyExchangeRateController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../../support/fakes";

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
