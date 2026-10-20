import { describe, expect, it, vi } from "vitest";
import { AmazonCountryController } from "@/modules/marketplaces/amazon/controllers/AmazonCountryController";
import { AmazonCountryService } from "@/modules/marketplaces/amazon/services/AmazonCountryService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { fakeResponse } from "../../../../../support/fakes";

const setup = () => {
  const service = {
    getAll: vi.fn().mockResolvedValue([{ countryId: 1 }]),
    getForScraping: vi.fn().mockResolvedValue([{ countryId: 2 }]),
    creatable: {},
    updatable: {},
  };
  return {
    service,
    controller: new AmazonCountryController(
      service as unknown as AmazonCountryService
    ),
  };
};

describe("AmazonCountryController", () => {
  it("composes CRUD controllers", () => {
    const { controller } = setup();
    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.updatable).toBeInstanceOf(UpdatableController);
  });

  it.each([
    ["getAll", [{ countryId: 1 }]],
    ["getForScraping", [{ countryId: 2 }]],
  ] as const)("%s returns json", async (method, expected) => {
    const { controller } = setup();
    const { response, json } = fakeResponse();

    await controller[method](response);

    expect(json).toHaveBeenCalledWith(expected);
  });

  it.each(["getAll", "getForScraping"] as const)(
    "%s sends an error response when the service throws",
    async (method) => {
      const { service, controller } = setup();
      service[method].mockRejectedValue(new Error("a"));
      const { response, status, send, json } = fakeResponse();

      await controller[method](response);

      expect(status).toHaveBeenCalledWith(500);
      expect(send).toHaveBeenCalledWith("a");
      expect(json).not.toHaveBeenCalled();
    }
  );
});
