import { describe, expect, it } from "vitest";
import { AmazonAdPriceRouter } from "@/routes/amazon/AmazonAdPriceRouter";
import { AmazonAdPriceController } from "@/controllers/amazon/AmazonAdPriceController";
import { CreatableRouter } from "@/shared/crud/routes/CreatableRouter";
import { UpdatableRouter } from "@/shared/crud/routes/UpdatableRouter";
import { DeletableRouter } from "@/shared/crud/routes/DeletableRouter";
import { fakeRouter, fakeSubRouter, routeTable } from "../../../support/fakes";

describe("AmazonAdPriceRouter", () => {
  it("is mounted at /amazon/ads/prices and uses the three CRUD routers in order", () => {
    const { router, calls } = fakeRouter();
    const priceRouter = new AmazonAdPriceRouter(
      {
        creatable: {},
        updatable: {},
        deletable: {},
      } as unknown as AmazonAdPriceController,
      fakeSubRouter<CreatableRouter<unknown>>("CREATABLE"),
      fakeSubRouter<UpdatableRouter<unknown>>("UPDATABLE"),
      fakeSubRouter<DeletableRouter>("DELETABLE"),
      router
    );

    expect(priceRouter.path).toBe("/amazon/ads/prices");
    expect(priceRouter.build().router).toBe(router);
    expect(routeTable(calls)).toEqual([
      ["use", "CREATABLE"],
      ["use", "UPDATABLE"],
      ["use", "DELETABLE"],
    ]);
  });
});
