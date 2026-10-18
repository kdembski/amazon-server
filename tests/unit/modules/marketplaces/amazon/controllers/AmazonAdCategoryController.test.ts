import { describe, expect, it, vi } from "vitest";
import { AmazonAdCategoryController } from "@/modules/marketplaces/amazon/controllers/AmazonAdCategoryController";
import { AmazonAdCategoryService } from "@/modules/marketplaces/amazon/services/AmazonAdCategoryService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { fakeResponse } from "../../../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    getForScraping: vi.fn().mockResolvedValue({ id: 2 }),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  return {
    service,
    controller: new AmazonAdCategoryController(
      service as unknown as AmazonAdCategoryService
    ),
  };
};

describe("AmazonAdCategoryController", () => {
  it("composes creatable, updatable and deletable controllers", () => {
    const { controller } = setup();
    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.updatable).toBeInstanceOf(UpdatableController);
    expect(controller.deletable).toBeInstanceOf(DeletableController);
  });

  it("getAll and getForScraping return json", async () => {
    const { controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getAll(response);
    await controller.getForScraping(response);

    expect(json).toHaveBeenNthCalledWith(1, [{ id: 1 }]);
    expect(json).toHaveBeenNthCalledWith(2, { id: 2 });
  });

  it("sends error responses when the service throws", async () => {
    const { service, controller } = setup();
    service.getAll.mockRejectedValue(new Error("a"));
    service.getForScraping.mockRejectedValue(new Error("b"));
    const { response, status, send, json } = fakeResponse();

    await controller.getAll(response);
    await controller.getForScraping(response);

    expect(status).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.map(([m]) => m)).toEqual(["a", "b"]);
    expect(json).not.toHaveBeenCalled();
  });
});
