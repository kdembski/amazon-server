import { Response, Request } from "express";
import { CreatableController } from "@/controllers/crud/CreatableController";
import { DeletableController } from "@/controllers/crud/DeletableController";
import { SelectableController } from "@/controllers/crud/SelectableController";
import { OlxAdService } from "@/services/olx/OlxAdService";
import { OlxAdWebSocketController } from "@/websockets/olx/OlxAdWebSocketController";
import { OlxAdCreateDto } from "@/dtos/olx/OlxAdDtos";

export class OlxAdController {
  private service;
  private adWsController;
  private creatable;
  selectable;
  deletable;

  constructor(
    service = new OlxAdService(),
    selectable = new SelectableController(service.selectable),
    creatable = new CreatableController(service),
    deletable = new DeletableController(service.deletable),
    adWsController = OlxAdWebSocketController.getInstance(service)
  ) {
    this.service = service;
    this.selectable = selectable;
    this.creatable = creatable;
    this.deletable = deletable;
    this.adWsController = adWsController;
  }

  async getAll(response: Response) {
    try {
      const results = await this.service.getAll();
      response.json(results);
    } catch (error: any) {
      response.status(500).send(error?.message);
    }
  }

  async create(request: Request<{}, {}, OlxAdCreateDto>, response: Response) {
    const ad = await this.creatable.create(request, response);
    if (ad) this.adWsController.sendAdToAll(ad.id);
  }
}
