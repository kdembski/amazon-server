import { describe, expect, it, vi } from "vitest";
import { AmazonSearchRuleController } from "@/modules/marketplaces/amazon/controllers/AmazonSearchRuleController";
import { AmazonSearchRuleService } from "@/modules/marketplaces/amazon/services/AmazonSearchRuleService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { fakeRequest, fakeResponse } from "../../../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    applyBatch: vi.fn().mockResolvedValue([{ id: 2 }]),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  return {
    service,
    controller: new AmazonSearchRuleController(
      service as unknown as AmazonSearchRuleService
    ),
  };
};

describe("AmazonSearchRuleController", () => {
  it("composes creatable, updatable and deletable controllers", () => {
    const { controller } = setup();
    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.updatable).toBeInstanceOf(UpdatableController);
    expect(controller.deletable).toBeInstanceOf(DeletableController);
  });

  it("getAll returns json", async () => {
    const { controller } = setup();
    const { response, json } = fakeResponse();

    await controller.getAll(response);

    expect(json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it("sends an error response when the service throws", async () => {
    const { service, controller } = setup();
    service.getAll.mockRejectedValue(new Error("a"));
    const { response, status, send } = fakeResponse();

    await controller.getAll(response);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("a");
  });
});

describe("AmazonSearchRuleController.applyBatch", () => {
  it("returns json with all rules", async () => {
    const { service, controller } = setup();
    const { response, json } = fakeResponse();

    await controller.applyBatch(fakeRequest({ body: { delete: [4] } }), response);

    expect(service.applyBatch).toHaveBeenCalledWith({ delete: [4] });
    expect(json).toHaveBeenCalledWith([{ id: 2 }]);
  });

  it("sends the error status when the service throws", async () => {
    const { service, controller } = setup();
    service.applyBatch.mockRejectedValue(
      Object.assign(new Error("bad"), { status: 400 })
    );
    const { response, status, send } = fakeResponse();

    await controller.applyBatch(fakeRequest({ body: {} }), response);

    expect(status).toHaveBeenCalledWith(400);
    expect(send).toHaveBeenCalledWith("bad");
  });
});
