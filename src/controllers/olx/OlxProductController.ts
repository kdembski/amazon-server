import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { OlxProductService } from "@/services/olx/OlxProductService";

export class OlxProductController {
  private service;
  selectable;
  creatable;
  updatable;
  deletable;

  constructor(
    service = new OlxProductService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service.creatable),
    updatable = new UpdatableController(service.updatable),
    deletable = new DeletableController(service.deletable)
  ) {
    this.service = service;
    this.selectable = selectable;
    this.creatable = creatable;
    this.updatable = updatable;
    this.deletable = deletable;
  }
}
