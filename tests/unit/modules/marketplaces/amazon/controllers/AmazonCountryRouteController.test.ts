import { describe, expect, it, vi } from "vitest";
import { AmazonCountryRouteController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryRouteController";
import { AmazonCountryRouteService } from "@/modules/marketplaces/amazon/services/AmazonCountryRouteService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { fakeResponse } from "../../../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ id: 1 }]),
    creatable: {},
    updatable: {},
    deletable: {},
  };
  return {
    service,
    controller: new AmazonCountryRouteController(service as unknown as AmazonCountryRouteService),
  };
};

describe("AmazonCountryRouteController", () => {
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
});
