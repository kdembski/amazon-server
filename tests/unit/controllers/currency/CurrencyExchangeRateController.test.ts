import { describe, expect, it } from "vitest";
import { CurrencyExchangeRateController } from "@/controllers/currency/CurrencyExchangeRateController";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";
import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";

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
