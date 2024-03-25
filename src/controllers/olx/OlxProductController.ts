import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { UpdatableController } from "@/controllers/crud/UpdatableController";
import { OlxProductService } from "@/services/olx/OlxProductService";

export class OlxProductController {
  private service;
  getById;
  create;
  update;
  delete;

  constructor(
    service = new OlxProductService(),
    selectable = new SelectableController(service),
    creatable = new CreatableController(service),
    updatable = new UpdatableController(service),
    deletable = new DeletableController(service)
  ) {
    this.service = service;
    this.getById = selectable.getById;
    this.create = creatable.create;
    this.update = updatable.update;
    this.delete = deletable.delete;
  }
}
