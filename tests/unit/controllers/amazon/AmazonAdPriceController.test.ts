import { describe, expect, it } from "vitest";
import { AmazonAdPriceController } from "@/controllers/amazon/AmazonAdPriceController";
import { AmazonAdPriceService } from "@/services/amazon/AmazonAdPriceService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";

describe("AmazonAdPriceController", () => {
  it("composes creatable, updatable and deletable controllers", () => {
    const service = {
      creatable: {},
      updatable: {},
      deletable: {},
    } as unknown as AmazonAdPriceService;

    const controller = new AmazonAdPriceController(service);

    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.updatable).toBeInstanceOf(UpdatableController);
    expect(controller.deletable).toBeInstanceOf(DeletableController);
  });
});
