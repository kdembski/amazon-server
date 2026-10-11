import { describe, expect, it } from "vitest";
import { CurrencyExchangeRateController } from "@/controllers/currency/CurrencyExchangeRateController";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";

describe("CurrencyExchangeRateController", () => {
  it("composes creatable, updatable and deletable controllers", () => {
    const service = {
      creatable: {},
      updatable: {},
      deletable: {},
    } as unknown as CurrencyExchangeRateService;

    const controller = new CurrencyExchangeRateController(service);

    expect(controller.creatable).toBeInstanceOf(CreatableController);
    expect(controller.updatable).toBeInstanceOf(UpdatableController);
    expect(controller.deletable).toBeInstanceOf(DeletableController);
  });
});
