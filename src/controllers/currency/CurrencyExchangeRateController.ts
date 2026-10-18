import { CreatableController } from "@/shared/crud/controllers/CreatableController";
import { DeletableController } from "@/shared/crud/controllers/DeletableController";
import { UpdatableController } from "@/shared/crud/controllers/UpdatableController";
import { CurrencyExchangeRateService } from "@/services/currency/CurrencyExchangeRateService";

export class CurrencyExchangeRateController {
  private service;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new CurrencyExchangeRateService(),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }
}
