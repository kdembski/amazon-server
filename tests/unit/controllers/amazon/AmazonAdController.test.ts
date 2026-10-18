import { describe, expect, it, vi } from "vitest";
import { AmazonAdController } from "@/controllers/amazon/AmazonAdController";
import { AmazonAdService } from "@/services/amazon/AmazonAdService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { SelectableController } from "@/shared/crud/controllers/SelectableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { fakeRequest, fakeResponse } from "../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    getForScraping: vi.fn().mockResolvedValue([{ id: 1, asin: "A" }]),
    updatePrices: vi.fn().mockResolvedValue(undefined),
    selectable: {},
    creatable: {},
    deletable: {},
  };
  return {
    service,
    controller: new AmazonAdController(service as unknown as AmazonAdService),
  };
};

describe("AmazonAdController", () => {
  it("composes selectable, creatable and deletable controllers", () => {
    const { controller } = setup();
    expect(controller.selectable).toBeInstanceOf(SelectableController);
    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.deletable).toBeInstanceOf(DeletableController);
  });

  it("getAll returns all ads", async () => {
    const { controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getAll(response);

    expect(json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("getForScraping parses count and defaults to 50", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getForScraping(fakeRequest({ query: { count: "7" } }), response);
    await controller.getForScraping(fakeRequest({ query: {} }), response);
    await controller.getForScraping(fakeRequest({ query: { count: "abc" } }), response);
    await controller.getForScraping(fakeRequest({ query: { count: "7abc" } }), response);
    // parseInt("0") || 50: zero is falsy, so a request for zero gets the default
    await controller.getForScraping(fakeRequest({ query: { count: "0" } }), response);

    expect(service.getForScraping.mock.calls.map(([c]) => c)).toEqual([7, 50, 50, 7, 50]);
    expect(json).toHaveBeenCalledWith([{ id: 1, asin: "A" }]);
  });

  it("update forwards id and prices", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();
    const prices = [{ value: 1, adId: 2, countryId: 3, dispatchFrom: "Amazon" }];

    await controller.update(
      fakeRequest({ params: { id: "2" }, body: { prices } }),
      response
    );

    expect(service.updatePrices).toHaveBeenCalledWith(2, prices);
    expect(json).toHaveBeenCalledWith(undefined);
  });

  it("sends error responses when the service throws", async () => {
    const { service, controller } = setup();
    service.getAll.mockRejectedValue(new Error("a"));
    service.getForScraping.mockRejectedValue(new Error("b"));
    service.updatePrices.mockRejectedValue(new Error("c"));
    const { response, status, send, json } = fakeResponse();

    await controller.getAll(response);
    await controller.getForScraping(fakeRequest({ query: {} }), response);
    await controller.update(
      fakeRequest({ params: { id: "1" }, body: { prices: [] } }),
      response
    );

    expect(status).toHaveBeenCalledTimes(3);
    expect(status).toHaveBeenCalledWith(500);
    expect(send.mock.calls.map(([m]) => m)).toEqual(["a", "b", "c"]);
    expect(json).not.toHaveBeenCalled();
  });
});
