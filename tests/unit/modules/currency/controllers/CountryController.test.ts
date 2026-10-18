import { describe, expect, it, vi } from "vitest";
import { CountryController } from "@/modules/currency/controllers/CountryController";
import { CountryService } from "@/modules/currency/services/CountryService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { fakeResponse } from "../../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  return {
    service,
    controller: new CountryController(service as unknown as CountryService),
  };
};

describe("CountryController", () => {
  it("composes CRUD controllers", () => {
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
    const { response, status, send, json } = fakeResponse();

    await controller.getAll(response);

    expect(status).toHaveBeenCalledWith(500);
    expect(send).toHaveBeenCalledWith("a");
    expect(json).not.toHaveBeenCalled();
  });
});
